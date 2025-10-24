/**
 * Feed Events Service
 * 
 * Fetches and transforms blockchain events from The Graph subgraph.
 * Uses Next.js 15 caching for optimal performance on Vercel.
 */

import { unstable_cache } from "next/cache";
import { SubgraphSDK } from "@buildeross/sdk";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";
import type { FeedEvent } from "@/lib/types/feed-events";

// Cache for 15 seconds with background revalidation
const CACHE_TTL = 15;
const CACHE_TAG = "feed-events";

/**
 * Query for recent proposals with their votes
 */
const PROPOSALS_QUERY = `
  query GetRecentProposals($daoAddress: String!, $since: BigInt!) {
    proposals(
      where: { dao: $daoAddress, timeCreated_gt: $since }
      orderBy: timeCreated
      orderDirection: desc
      first: 100
    ) {
      id
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
      canceled
      vetoed
      queued
      snapshotBlockNumber
      transactionHash
    }
  }
`;

/**
 * Query for recent votes
 */
const VOTES_QUERY = `
  query GetRecentVotes($daoAddress: String!, $since: BigInt!) {
    proposalVotes(
      where: { 
        proposal_: { dao: $daoAddress }
        timestamp_gt: $since
      }
      orderBy: timestamp
      orderDirection: desc
      first: 200
    ) {
      id
      voter
      support
      weight
      reason
      timestamp
      transactionHash
      proposal {
        proposalNumber
        title
      }
    }
  }
`;

/**
 * Query for recent auctions
 */
const AUCTIONS_QUERY = `
  query GetRecentAuctions($daoAddress: String!, $since: BigInt!) {
    auctions(
      where: { dao: $daoAddress, startTime_gt: $since }
      orderBy: startTime
      orderDirection: desc
      first: 50
    ) {
      id
      startTime
      endTime
      settled
      token {
        tokenId
        image
      }
    }
  }
`;

/**
 * Query for recent auction bids
 */
const BIDS_QUERY = `
  query GetRecentBids($daoAddress: String!, $since: BigInt!) {
    auctionBids(
      where: { 
        auction_: { dao: $daoAddress }
        bidTime_gt: $since
      }
      orderBy: bidTime
      orderDirection: desc
      first: 200
    ) {
      id
      bidder
      amount
      bidTime
      transactionHash
      auction {
        token {
          tokenId
          image
        }
        endTime
      }
    }
  }
`;

/**
 * Query for recent token mints/transfers
 */
const TOKENS_QUERY = `
  query GetRecentTokens($daoAddress: String!, $since: BigInt!) {
    tokens(
      where: { dao: $daoAddress, mintedAt_gt: $since }
      orderBy: mintedAt
      orderDirection: desc
      first: 100
    ) {
      id
      tokenId
      owner
      mintedAt
    }
  }
`;

/**
 * Query for delegate changes (not yet implemented)
 */
// const DELEGATES_QUERY = `
//   query GetRecentDelegates($daoAddress: String!, $since: BigInt!) {
//     daoTokenOwners(
//       where: { 
//         dao: $daoAddress
//         # Note: We'd need a timestamp field for filtering
//       }
//       orderBy: daoTokenCount
//       orderDirection: desc
//       first: 50
//     ) {
//       id
//       owner
//       delegate
//       daoTokenCount
//     }
//   }
// `;

// Type definitions for subgraph responses
interface SubgraphProposal {
  id: string;
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
  canceled: boolean;
  vetoed: boolean;
  queued: boolean;
  snapshotBlockNumber: string;
  transactionHash: string;
}

interface SubgraphVote {
  id: string;
  voter: string;
  support: string;
  weight: string;
  reason: string | null;
  timestamp: string;
  transactionHash: string;
  proposal: {
    proposalNumber: number;
    title: string | null;
  };
}

interface SubgraphBid {
  id: string;
  bidder: string;
  amount: string;
  bidTime: string;
  transactionHash: string;
  auction: {
    token: {
      tokenId: string;
      image?: string | null;
    };
    endTime: string;
  };
}

interface SubgraphToken {
  id: string;
  tokenId: string;
  owner: string;
  mintedAt: string;
}

interface SubgraphAuction {
  id: string;
  startTime: string;
  endTime: string;
  settled: boolean;
  token: {
    tokenId: string;
    image?: string | null;
  };
}

/**
 * Transform subgraph proposal to feed event
 */
function transformProposalToEvent(p: SubgraphProposal): FeedEvent {
  return {
    id: `proposal-${p.proposalId}`,
    type: "ProposalCreated",
    category: "governance",
    priority: "HIGH",
    timestamp: Number(p.timeCreated),
    blockNumber: Number(p.snapshotBlockNumber),
    transactionHash: p.transactionHash,
    proposalId: p.proposalId,
    proposalNumber: p.proposalNumber,
    title: p.title || `Proposal #${p.proposalNumber}`,
    description: p.description || "",
    proposer: p.proposer,
    voteStart: Number(p.voteStart),
    voteEnd: Number(p.voteEnd),
    quorumVotes: Number(p.quorumVotes),
  };
}

/**
 * Transform subgraph vote to feed event
 */
function transformVoteToEvent(v: SubgraphVote): FeedEvent {
  const supportMap: Record<string, "FOR" | "AGAINST" | "ABSTAIN"> = {
    "0": "AGAINST",
    "1": "FOR",
    "2": "ABSTAIN",
    "AGAINST": "AGAINST",
    "FOR": "FOR",
    "ABSTAIN": "ABSTAIN",
  };

  return {
    id: `vote-${v.id}`,
    type: "VoteCast",
    category: "governance",
    priority: v.reason && v.reason.length > 0 ? "HIGH" : "MEDIUM",
    timestamp: Number(v.timestamp),
    blockNumber: 0, // Not available in vote data
    transactionHash: v.transactionHash,
    proposalId: "", // Not directly available
    proposalNumber: v.proposal.proposalNumber,
    proposalTitle: v.proposal.title || `Proposal #${v.proposal.proposalNumber}`,
    voter: v.voter,
    support: supportMap[v.support] || "ABSTAIN",
    weight: Number(v.weight),
    reason: v.reason || undefined,
  };
}

/**
 * Convert IPFS URI to HTTP URL
 */
function toHttpUrl(uri?: string | null): string | undefined {
  if (!uri) return undefined;
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return uri;
}

/**
 * Transform subgraph bid to feed event
 */
function transformBidToEvent(b: SubgraphBid): FeedEvent {
  return {
    id: `bid-${b.id}`,
    type: "AuctionBid",
    category: "auction",
    priority: "HIGH",
    timestamp: Number(b.bidTime),
    blockNumber: 0,
    transactionHash: b.transactionHash,
    tokenId: Number(b.auction.token.tokenId),
    bidder: b.bidder,
    amount: (Number(b.amount) / 1e18).toFixed(5), // Convert from wei to ETH (5 decimals)
    extended: false, // Extended field not available in subgraph
    endTime: Number(b.auction.endTime),
    imageUrl: toHttpUrl(b.auction.token.image),
  };
}

/**
 * Transform subgraph auction to feed event
 */
function transformAuctionToEvent(a: SubgraphAuction): FeedEvent | null {
  // Show all auctions (both new and settled)
  return {
    id: `auction-${a.id}`,
    type: "AuctionCreated",
    category: "auction",
    priority: "HIGH",
    timestamp: Number(a.startTime),
    blockNumber: 0,
    transactionHash: "",
    tokenId: Number(a.token.tokenId),
    startTime: Number(a.startTime),
    endTime: Number(a.endTime),
    imageUrl: toHttpUrl(a.token.image),
  };
}

/**
 * Transform subgraph token to feed event
 */
function transformTokenToEvent(t: SubgraphToken): FeedEvent {
  return {
    id: `token-${t.id}`,
    type: "TokenMinted",
    category: "token",
    priority: "HIGH",
    timestamp: Number(t.mintedAt),
    blockNumber: 0,
    transactionHash: "",
    tokenId: Number(t.tokenId),
    recipient: t.owner,
    isFounder: false, // Would need to check mint schedule
  };
}

/**
 * Fetch feed events from subgraph (uncached)
 */
async function fetchFeedEventsUncached(hoursBack: number = 24): Promise<FeedEvent[]> {
  const now = Math.floor(Date.now() / 1000);
  const since = now - (hoursBack * 3600);
  const daoAddress = GNARS_ADDRESSES.token.toLowerCase();

  const events: FeedEvent[] = [];

  try {
    // Fetch all data in parallel
    // Try with time filter first, then without if empty
    const [proposalsData, votesData, bidsData, auctionsData, tokensData] = await Promise.all([
      subgraphQuery<{ proposals: SubgraphProposal[] }>(PROPOSALS_QUERY, {
        daoAddress,
        since: since.toString(),
      }).catch((e) => {
        console.error("[feed-events] Proposals query error:", e);
        return { proposals: [] };
      }),

      subgraphQuery<{ proposalVotes: SubgraphVote[] }>(VOTES_QUERY, {
        daoAddress,
        since: since.toString(),
      }).catch((e) => {
        console.error("[feed-events] Votes query error:", e);
        return { proposalVotes: [] };
      }),

      subgraphQuery<{ auctionBids: SubgraphBid[] }>(BIDS_QUERY, {
        daoAddress,
        since: since.toString(),
      }).catch((e) => {
        console.error("[feed-events] Bids query error:", e);
        return { auctionBids: [] };
      }),

      subgraphQuery<{ auctions: SubgraphAuction[] }>(AUCTIONS_QUERY, {
        daoAddress,
        since: since.toString(),
      }).catch((e) => {
        console.error("[feed-events] Auctions query error:", e);
        return { auctions: [] };
      }),

      subgraphQuery<{ tokens: SubgraphToken[] }>(TOKENS_QUERY, {
        daoAddress,
        since: since.toString(),
      }).catch((e) => {
        console.error("[feed-events] Tokens query error:", e);
        return { tokens: [] };
      }),
    ]);

    // If no data with time filter, try without it (get ALL recent data)
    if (!proposalsData.proposals?.length && 
        !votesData.proposalVotes?.length && 
        !bidsData.auctionBids?.length) {
      const allDataQuery = `
        query GetAllRecentData($daoAddress: String!) {
          proposals(
            where: { dao: $daoAddress }
            orderBy: timeCreated
            orderDirection: desc
            first: 50
          ) {
            id
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
            canceled
            vetoed
            queued
            snapshotBlockNumber
            transactionHash
          }
          proposalVotes(
            orderBy: timestamp
            orderDirection: desc
            first: 100
          ) {
            id
            voter
            support
            weight
            reason
            timestamp
            transactionHash
            proposal {
              proposalNumber
              title
            }
          }
        }
      `;
      
      const allData = await subgraphQuery<{
        proposals: SubgraphProposal[];
        proposalVotes: SubgraphVote[];
      }>(allDataQuery, {
        daoAddress,
      }).catch((e) => {
        console.error("[feed-events] All data query error:", e);
        return { proposals: [], proposalVotes: [] };
      });
      
      if (allData.proposals) proposalsData.proposals = allData.proposals;
      if (allData.proposalVotes) votesData.proposalVotes = allData.proposalVotes;
    }

    // Transform proposals
    if (proposalsData.proposals && proposalsData.proposals.length > 0) {
      events.push(...proposalsData.proposals.map(transformProposalToEvent));

      // Add status events for executed/canceled/vetoed proposals
      for (const p of proposalsData.proposals) {
        if (p.executed) {
          events.push({
            id: `proposal-executed-${p.proposalId}`,
            type: "ProposalExecuted",
            category: "governance",
            priority: "HIGH",
            timestamp: Number(p.timeCreated), // Approximation
            blockNumber: Number(p.snapshotBlockNumber),
            transactionHash: p.transactionHash,
            proposalId: p.proposalId,
            proposalNumber: p.proposalNumber,
            proposalTitle: p.title || `Proposal #${p.proposalNumber}`,
          });
        }

        if (p.queued) {
          events.push({
            id: `proposal-queued-${p.proposalId}`,
            type: "ProposalQueued",
            category: "governance",
            priority: "HIGH",
            timestamp: Number(p.timeCreated),
            blockNumber: Number(p.snapshotBlockNumber),
            transactionHash: p.transactionHash,
            proposalId: p.proposalId,
            proposalNumber: p.proposalNumber,
            proposalTitle: p.title || `Proposal #${p.proposalNumber}`,
            eta: Number(p.voteEnd) + 86400, // Approximation
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
            proposalTitle: p.title || `Proposal #${p.proposalNumber}`,
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
            proposalTitle: p.title || `Proposal #${p.proposalNumber}`,
          });
        }
      }
    }

    // Transform votes
    if (votesData.proposalVotes) {
      events.push(...votesData.proposalVotes.map(transformVoteToEvent));
    }

    // Transform bids
    if (bidsData.auctionBids) {
      events.push(...bidsData.auctionBids.map(transformBidToEvent));
    }

    // Transform auctions
    if (auctionsData.auctions) {
      const auctionEvents = auctionsData.auctions
        .map(transformAuctionToEvent)
        .filter((e): e is FeedEvent => e !== null);
      events.push(...auctionEvents);
    }

    // Transform tokens
    if (tokensData.tokens) {
      events.push(...tokensData.tokens.map(transformTokenToEvent));
    }

    // Sort by timestamp descending
    return events.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("[feed-events] Error fetching feed events:", error);
    if (error instanceof Error) {
      console.error("[feed-events] Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
    return [];
  }
}

/**
 * Fetch feed events with Next.js 15 caching
 * 
 * Uses unstable_cache for automatic revalidation on Vercel.
 * Cache is tagged for manual revalidation if needed.
 */
export const fetchFeedEvents = unstable_cache(
  async (hoursBack: number = 24) => {
    return await fetchFeedEventsUncached(hoursBack);
  },
  ["feed-events"],
  {
    revalidate: CACHE_TTL,
    tags: [CACHE_TAG],
  }
);

/**
 * Generate computed/time-based events
 * 
 * These events are derived from current data and time, not blockchain events.
 */
export async function generateComputedEvents(): Promise<FeedEvent[]> {
  const events: FeedEvent[] = [];
  const now = Math.floor(Date.now() / 1000);

  try {
    // Get recent proposals to check their timing
    const sdk = SubgraphSDK.connect(CHAIN.id);
    const { proposals } = await sdk.proposals({
      where: {
        dao: GNARS_ADDRESSES.token.toLowerCase(),
      },
      first: 20,
    });

    for (const p of proposals || []) {
      const voteStart = Number(p.voteStart || 0);
      const voteEnd = Number(p.voteEnd || 0);

      // Voting opened (within last hour)
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

      // Voting closing soon (within next 6 hours)
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
    console.error("Error generating computed events:", error);
  }

  return events;
}

/**
 * Get all feed events (cached blockchain + computed)
 */
export async function getAllFeedEvents(hoursBack: number = 24): Promise<FeedEvent[]> {
  const [blockchainEvents, computedEvents] = await Promise.all([
    fetchFeedEvents(hoursBack),
    generateComputedEvents(),
  ]);

  return [...blockchainEvents, ...computedEvents]
    .sort((a, b) => b.timestamp - a.timestamp);
}

