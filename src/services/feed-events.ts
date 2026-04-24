/**
 * Feed Events Service
 *
 * Fetches DAO activity from The Graph via a single unified `feedEvents`
 * query (Builder subgraph union interface). Replaces the previous 5-query
 * parallel fetch-and-merge approach.
 */

import { unstable_cache } from "next/cache";
import { SubgraphSDK } from "@buildeross/sdk";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";
import type { FeedEvent } from "@/lib/types/feed-events";

const CACHE_TTL = 15;
const CACHE_TAG = "feed-events";

// Cap at 100 per Builder subgraph convention; we over-fetch to cover
// post-filter event drops (Updated/Clanker/Zora currently unmapped) and
// derived status events.
const DEFAULT_FETCH_LIMIT = 100;

const FEED_EVENTS_QUERY = `
  query GnarsFeedEvents($first: Int!, $where: FeedEvent_filter) {
    feedEvents(
      first: $first
      where: $where
      orderBy: timestamp
      orderDirection: desc
    ) {
      __typename
      id
      type
      timestamp
      blockNumber
      transactionHash
      actor

      ... on ProposalCreatedEvent {
        proposal {
          proposalId
          proposalNumber
          title
          description
          proposer
          timeCreated
          voteStart
          voteEnd
          quorumVotes
          executed
          queued
          canceled
          vetoed
          snapshotBlockNumber
          transactionHash
        }
      }

      ... on ProposalVotedEvent {
        proposal {
          proposalId
          proposalNumber
          title
        }
        vote {
          support
          weight
          reason
        }
      }

      ... on ProposalExecutedEvent {
        proposal {
          proposalId
          proposalNumber
          title
        }
      }

      ... on AuctionCreatedEvent {
        auction {
          id
          startTime
          endTime
          token {
            tokenId
            image
          }
        }
      }

      ... on AuctionBidPlacedEvent {
        auction {
          id
          endTime
          token {
            tokenId
            image
          }
        }
        bid {
          amount
          bidder
        }
      }

      ... on AuctionSettledEvent {
        auction {
          id
          token {
            tokenId
            image
            owner
          }
        }
        amount
      }
    }
  }
`;

interface BaseSubgraphEvent {
  __typename: string;
  id: string;
  type: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
  actor: string;
}

interface SubgraphProposalRef {
  proposalId: string;
  proposalNumber: number;
  title: string | null;
  description?: string | null;
  proposer?: string;
  timeCreated?: string;
  voteStart?: string;
  voteEnd?: string;
  quorumVotes?: string;
  executed?: boolean;
  queued?: boolean;
  canceled?: boolean;
  vetoed?: boolean;
  snapshotBlockNumber?: string;
  transactionHash?: string;
}

interface SubgraphProposalCreated extends BaseSubgraphEvent {
  __typename: "ProposalCreatedEvent";
  proposal: {
    proposalId: string;
    proposalNumber: number;
    title: string | null;
    description: string | null;
    proposer: string;
    timeCreated: string;
    voteStart: string;
    voteEnd: string;
    quorumVotes: string;
    executed: boolean;
    queued: boolean;
    canceled: boolean;
    vetoed: boolean;
    snapshotBlockNumber: string;
    transactionHash: string;
  };
}

interface SubgraphProposalVoted extends BaseSubgraphEvent {
  __typename: "ProposalVotedEvent";
  proposal: SubgraphProposalRef;
  vote: {
    support: string;
    weight: string;
    reason: string | null;
  };
}

interface SubgraphProposalExecuted extends BaseSubgraphEvent {
  __typename: "ProposalExecutedEvent";
  proposal: SubgraphProposalRef;
}

interface SubgraphAuctionCreated extends BaseSubgraphEvent {
  __typename: "AuctionCreatedEvent";
  auction: {
    id: string;
    startTime: string;
    endTime: string;
    token: { tokenId: string; image?: string | null };
  };
}

interface SubgraphAuctionBidPlaced extends BaseSubgraphEvent {
  __typename: "AuctionBidPlacedEvent";
  auction: {
    id: string;
    endTime: string;
    token: { tokenId: string; image?: string | null };
  };
  bid: { amount: string; bidder: string };
}

interface SubgraphAuctionSettled extends BaseSubgraphEvent {
  __typename: "AuctionSettledEvent";
  auction: {
    id: string;
    token: { tokenId: string; image?: string | null; owner: string };
  };
  amount: string;
}

type SubgraphFeedEvent =
  | SubgraphProposalCreated
  | SubgraphProposalVoted
  | SubgraphProposalExecuted
  | SubgraphAuctionCreated
  | SubgraphAuctionBidPlaced
  | SubgraphAuctionSettled
  | (BaseSubgraphEvent & { __typename: string });

function toHttpUrl(uri?: string | null): string | undefined {
  if (!uri) return undefined;
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return uri;
}

const VOTE_SUPPORT: Record<string, "FOR" | "AGAINST" | "ABSTAIN"> = {
  "0": "AGAINST",
  "1": "FOR",
  "2": "ABSTAIN",
  AGAINST: "AGAINST",
  FOR: "FOR",
  ABSTAIN: "ABSTAIN",
};

function weiToEth(wei: string): string {
  return (Number(wei) / 1e18).toFixed(5);
}

function transformEvent(event: SubgraphFeedEvent): FeedEvent[] {
  const ts = Number(event.timestamp);
  const block = Number(event.blockNumber);

  switch (event.__typename) {
    case "ProposalCreatedEvent": {
      const e = event as SubgraphProposalCreated;
      const p = e.proposal;
      const title = p.title || `Proposal #${p.proposalNumber}`;
      const events: FeedEvent[] = [
        {
          id: `proposal-${p.proposalId}`,
          type: "ProposalCreated",
          category: "governance",
          priority: "HIGH",
          timestamp: Number(p.timeCreated),
          blockNumber: Number(p.snapshotBlockNumber),
          transactionHash: p.transactionHash,
          proposalId: p.proposalId,
          proposalNumber: p.proposalNumber,
          title,
          description: p.description || "",
          proposer: p.proposer,
          voteStart: Number(p.voteStart),
          voteEnd: Number(p.voteEnd),
          quorumVotes: Number(p.quorumVotes),
        },
      ];

      // Builder subgraph emits ProposalExecutedEvent natively but NOT
      // Queued/Canceled/Vetoed. Synthesize those from current proposal
      // flags carried on the ProposalCreatedEvent relation.
      if (p.queued) {
        events.push({
          id: `proposal-queued-${p.proposalId}`,
          type: "ProposalQueued",
          category: "governance",
          priority: "HIGH",
          timestamp: Number(p.voteEnd),
          blockNumber: Number(p.snapshotBlockNumber),
          transactionHash: p.transactionHash,
          proposalId: p.proposalId,
          proposalNumber: p.proposalNumber,
          proposalTitle: title,
          eta: Number(p.voteEnd) + 86400,
        });
      }
      if (p.canceled) {
        events.push({
          id: `proposal-canceled-${p.proposalId}`,
          type: "ProposalCanceled",
          category: "governance",
          priority: "MEDIUM",
          timestamp: Number(p.timeCreated),
          blockNumber: Number(p.snapshotBlockNumber),
          transactionHash: p.transactionHash,
          proposalId: p.proposalId,
          proposalNumber: p.proposalNumber,
          proposalTitle: title,
        });
      }
      if (p.vetoed) {
        events.push({
          id: `proposal-vetoed-${p.proposalId}`,
          type: "ProposalVetoed",
          category: "governance",
          priority: "HIGH",
          timestamp: Number(p.timeCreated),
          blockNumber: Number(p.snapshotBlockNumber),
          transactionHash: p.transactionHash,
          proposalId: p.proposalId,
          proposalNumber: p.proposalNumber,
          proposalTitle: title,
        });
      }
      return events;
    }

    case "ProposalVotedEvent": {
      const e = event as SubgraphProposalVoted;
      const support = VOTE_SUPPORT[e.vote.support] || "ABSTAIN";
      return [
        {
          id: `vote-${e.id}`,
          type: "VoteCast",
          category: "governance",
          priority: e.vote.reason && e.vote.reason.length > 0 ? "HIGH" : "MEDIUM",
          timestamp: ts,
          blockNumber: block,
          transactionHash: e.transactionHash,
          proposalId: e.proposal.proposalId,
          proposalNumber: e.proposal.proposalNumber,
          proposalTitle: e.proposal.title || `Proposal #${e.proposal.proposalNumber}`,
          voter: e.actor,
          support,
          weight: Number(e.vote.weight),
          reason: e.vote.reason || undefined,
        },
      ];
    }

    case "ProposalExecutedEvent": {
      const e = event as SubgraphProposalExecuted;
      return [
        {
          id: `proposal-executed-${e.proposal.proposalId}`,
          type: "ProposalExecuted",
          category: "governance",
          priority: "HIGH",
          timestamp: ts,
          blockNumber: block,
          transactionHash: e.transactionHash,
          proposalId: e.proposal.proposalId,
          proposalNumber: e.proposal.proposalNumber,
          proposalTitle: e.proposal.title || `Proposal #${e.proposal.proposalNumber}`,
        },
      ];
    }

    case "AuctionCreatedEvent": {
      const e = event as SubgraphAuctionCreated;
      return [
        {
          id: `auction-${e.auction.id}`,
          type: "AuctionCreated",
          category: "auction",
          priority: "HIGH",
          timestamp: Number(e.auction.startTime),
          blockNumber: block,
          transactionHash: e.transactionHash,
          tokenId: Number(e.auction.token.tokenId),
          startTime: Number(e.auction.startTime),
          endTime: Number(e.auction.endTime),
          imageUrl: toHttpUrl(e.auction.token.image),
        },
      ];
    }

    case "AuctionBidPlacedEvent": {
      const e = event as SubgraphAuctionBidPlaced;
      return [
        {
          id: `bid-${e.id}`,
          type: "AuctionBid",
          category: "auction",
          priority: "HIGH",
          timestamp: ts,
          blockNumber: block,
          transactionHash: e.transactionHash,
          tokenId: Number(e.auction.token.tokenId),
          bidder: e.bid.bidder,
          amount: weiToEth(e.bid.amount),
          extended: false,
          endTime: Number(e.auction.endTime),
          imageUrl: toHttpUrl(e.auction.token.image),
        },
      ];
    }

    case "AuctionSettledEvent": {
      const e = event as SubgraphAuctionSettled;
      // Skip no-bid settlements (common on low-activity DAO days).
      // The subgraph emits `amount: "0"` + zero-address owner when an
      // auction ends with no bidder; surfacing those as "Auction Won"
      // cards renders "Unknown won for 0.00e+0 ETH" — noisy and
      // misleading. Old feed never emitted settled events at all, so
      // filtering preserves the less-spammy baseline while still
      // showing real settled auctions with actual winners.
      if (!e.amount || e.amount === "0") return [];
      return [
        {
          id: `auction-settled-${e.auction.id}`,
          type: "AuctionSettled",
          category: "auction",
          priority: "HIGH",
          timestamp: ts,
          blockNumber: block,
          transactionHash: e.transactionHash,
          tokenId: Number(e.auction.token.tokenId),
          winner: e.auction.token.owner,
          amount: weiToEth(e.amount),
          imageUrl: toHttpUrl(e.auction.token.image),
        },
      ];
    }

    // Unmapped Builder event types (ProposalUpdated, ClankerTokenCreated,
    // ZoraCoinCreated, ZoraDropCreated). Skip until local FeedEvent union
    // grows support.
    default:
      return [];
  }
}

async function fetchFeedEventsUncached(hoursBack: number = 24): Promise<FeedEvent[]> {
  const now = Math.floor(Date.now() / 1000);
  const since = now - hoursBack * 3600;
  const daoAddress = DAO_ADDRESSES.token.toLowerCase();

  try {
    const data = await subgraphQuery<{ feedEvents: SubgraphFeedEvent[] }>(FEED_EVENTS_QUERY, {
      first: DEFAULT_FETCH_LIMIT,
      where: {
        dao: daoAddress,
        timestamp_gt: since.toString(),
      },
    });

    const events = (data.feedEvents || []).flatMap(transformEvent);
    return events.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("[feed-events] feedEvents query error:", error);
    return [];
  }
}

const fetchFeedEvents = unstable_cache(
  async (hoursBack: number = 24) => fetchFeedEventsUncached(hoursBack),
  ["feed-events"],
  {
    revalidate: CACHE_TTL,
    tags: [CACHE_TAG],
  },
);

/**
 * Derived time-based events (VotingOpened, VotingClosingSoon). Kept
 * separate from the subgraph feedEvents query because these are computed
 * against current wall-clock time, not emitted onchain events.
 */
async function generateComputedEvents(): Promise<FeedEvent[]> {
  const events: FeedEvent[] = [];
  const now = Math.floor(Date.now() / 1000);

  try {
    const sdk = SubgraphSDK.connect(CHAIN.id);
    const { proposals } = await sdk.proposals({
      where: {
        dao: DAO_ADDRESSES.token.toLowerCase(),
      },
      first: 20,
    });

    for (const p of proposals || []) {
      const voteStart = Number(p.voteStart || 0);
      const voteEnd = Number(p.voteEnd || 0);

      if (voteStart <= now && voteStart > now - 3600) {
        events.push({
          id: `voting-open-${p.proposalId}`,
          type: "VotingOpened",
          category: "governance",
          priority: "HIGH",
          timestamp: voteStart,
          blockNumber: 0,
          transactionHash: "",
          proposalId: p.proposalId || "",
          proposalNumber: Number(p.proposalNumber || 0),
          proposalTitle: p.title || `Proposal #${p.proposalNumber}`,
          voteEnd,
        });
      }

      const hoursUntilEnd = (voteEnd - now) / 3600;
      if (hoursUntilEnd > 0 && hoursUntilEnd <= 6) {
        events.push({
          id: `voting-closing-${p.proposalId}`,
          type: "VotingClosingSoon",
          category: "governance",
          priority: "HIGH",
          timestamp: now,
          blockNumber: 0,
          transactionHash: "",
          proposalId: p.proposalId || "",
          proposalNumber: Number(p.proposalNumber || 0),
          proposalTitle: p.title || `Proposal #${p.proposalNumber}`,
          voteEnd,
          hoursLeft: Math.ceil(hoursUntilEnd),
        });
      }
    }
  } catch (error) {
    console.error("[feed-events] Error generating computed events:", error);
  }

  return events;
}

export async function getAllFeedEvents(hoursBack: number = 24): Promise<FeedEvent[]> {
  const [blockchainEvents, computedEvents] = await Promise.all([
    fetchFeedEvents(hoursBack),
    generateComputedEvents(),
  ]);

  return [...blockchainEvents, ...computedEvents].sort((a, b) => b.timestamp - a.timestamp);
}
