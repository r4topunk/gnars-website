import { GNARS_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";

export type MemberOverview = {
  address: string;
  delegate: string;
  tokensHeld: number[];
  tokenCount: number;
  tokens: Array<{
    id: number;
    imageUrl?: string | null;
    mintedAt?: number;
    endTime?: number;
    settled?: boolean;
    finalBidWei?: string;
    winner?: string;
  }>;
};

export type MemberProposals = {
  proposals: Array<{
    id: string;
    proposalNumber: number;
    title?: string | null;
    description?: string | null;
    timeCreated: number;
    state?: string | null;
  }>;
};

export type MemberVotes = {
  votes: Array<{
    id: string;
    proposalId: string;
    proposalNumber: number;
    proposalTitle?: string | null;
    support: "FOR" | "AGAINST" | "ABSTAIN";
    weight: number;
    reason?: string | null;
    timestamp: number;
  }>;
};

type TokensQuery = {
  tokens: Array<{
    tokenId: string;
    ownerInfo: { delegate: string; owner: string };
    image?: string | null;
    mintedAt?: string;
    auction?: {
      endTime: string;
      settled: boolean;
      highestBid?: { amount: string; bidder: string } | null;
      winningBid?: { amount: string; bidder: string } | null;
    } | null;
  }>;
};

const MEMBER_TOKENS_GQL = /* GraphQL */ `
  query MemberTokens($dao: ID!, $owner: Bytes!) {
    tokens(where: { dao: $dao, owner: $owner }, orderBy: tokenId, orderDirection: asc) {
      tokenId
      ownerInfo {
        owner
        delegate
      }
      image
      mintedAt
      auction {
        endTime
        settled
        highestBid {
          amount
          bidder
        }
        winningBid {
          amount
          bidder
        }
      }
    }
  }
`;

export async function fetchMemberOverview(address: string): Promise<MemberOverview> {
  const dao = GNARS_ADDRESSES.token.toLowerCase();

  // Fetch tokens held by the member
  const tokensData = await subgraphQuery<TokensQuery>(MEMBER_TOKENS_GQL, {
    dao,
    owner: address.toLowerCase(),
  });

  const tokenIds: number[] = (tokensData.tokens || []).map((t) => Number(t.tokenId));
  // Derive delegate from the first token's ownerInfo if available; fall back to self
  const delegate = tokensData.tokens?.[0]?.ownerInfo?.delegate ?? address;
  const tokens = (tokensData.tokens || []).map((t) => ({
    id: Number(t.tokenId),
    imageUrl: t.image ?? undefined,
    mintedAt: t.mintedAt ? Number(t.mintedAt) : undefined,
    endTime: t.auction?.endTime ? Number(t.auction.endTime) : undefined,
    settled: t.auction?.settled ?? undefined,
    finalBidWei: t.auction?.winningBid?.amount ?? t.auction?.highestBid?.amount ?? undefined,
    winner: t.auction?.winningBid?.bidder ?? undefined,
  }));

  return {
    address,
    delegate,
    tokensHeld: tokenIds,
    tokenCount: tokenIds.length,
    tokens,
  };
}

type ProposalsQuery = {
  proposals: Array<{
    id: string;
    proposalNumber: number;
    title?: string | null;
    description?: string | null;
    timeCreated: string;
    proposer: string;
    canceled: boolean;
    executed: boolean;
    vetoed: boolean;
  }>;
};

const MEMBER_PROPOSALS_GQL = /* GraphQL */ `
  query MemberProposals($dao: ID!, $proposer: Bytes!, $first: Int!, $skip: Int!) {
    proposals(
      where: { dao: $dao, proposer: $proposer }
      orderBy: timeCreated
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      proposalNumber
      title
      description
      timeCreated
      proposer
      canceled
      executed
      vetoed
    }
  }
`;

export async function fetchMemberProposals(address: string, limit = 50): Promise<MemberProposals> {
  const dao = GNARS_ADDRESSES.token.toLowerCase();
  const PAGE = Math.min(limit, 50);
  const data = await subgraphQuery<ProposalsQuery>(MEMBER_PROPOSALS_GQL, {
    dao,
    proposer: address.toLowerCase(),
    first: PAGE,
    skip: 0,
  });

  const proposals = (data.proposals || []).map((p) => ({
    id: p.id,
    proposalNumber: Number(p.proposalNumber),
    title: p.title,
    description: p.description,
    timeCreated: Number(p.timeCreated) * 1000,
    state: p.vetoed ? "VETOED" : p.canceled ? "CANCELED" : p.executed ? "EXECUTED" : undefined,
  }));

  return { proposals };
}

type VotesQuery = {
  proposalVotes: Array<{
    id: string;
    timestamp: string;
    voter: string;
    support: "FOR" | "AGAINST" | "ABSTAIN";
    weight: number;
    reason?: string | null;
    proposal: {
      id: string;
      proposalNumber: number;
      title?: string | null;
    };
  }>;
};

const MEMBER_VOTES_GQL = /* GraphQL */ `
  query MemberVotes($dao: ID!, $voter: Bytes!, $first: Int!, $skip: Int!) {
    proposalVotes(
      where: { proposal_: { dao: $dao }, voter: $voter }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      timestamp
      voter
      support
      weight
      reason
      proposal {
        id
        proposalNumber
        title
      }
    }
  }
`;

export async function fetchMemberVotes(address: string, limit = 100): Promise<MemberVotes> {
  const dao = GNARS_ADDRESSES.token.toLowerCase();
  const PAGE = Math.min(limit, 100);
  const data = await subgraphQuery<VotesQuery>(MEMBER_VOTES_GQL, {
    dao,
    voter: address.toLowerCase(),
    first: PAGE,
    skip: 0,
  });

  const votes = (data.proposalVotes || []).map((v) => ({
    id: v.id,
    timestamp: Number(v.timestamp) * 1000,
    voter: v.voter,
    support: v.support,
    weight: Number(v.weight || 0),
    reason: v.reason ?? null,
    proposalId: v.proposal.id,
    proposalNumber: Number(v.proposal.proposalNumber),
    proposalTitle: v.proposal.title ?? null,
  }));

  return { votes };
}

type DelegatedByTokensQuery = {
  tokens: Array<{
    ownerInfo: { owner: string; delegate: string };
  }>;
};

const MEMBER_DELEGATED_BY_TOKENS_GQL = /* GraphQL */ `
  query DelegatedByTokens($dao: ID!, $delegate: Bytes!) {
    tokens(where: { dao: $dao, ownerInfo_: { delegate: $delegate } }, first: 1000) {
      ownerInfo {
        owner
        delegate
      }
    }
  }
`;

export async function fetchDelegators(address: string): Promise<string[]> {
  const dao = GNARS_ADDRESSES.token.toLowerCase();
  const data = await subgraphQuery<DelegatedByTokensQuery>(MEMBER_DELEGATED_BY_TOKENS_GQL, {
    dao,
    delegate: address.toLowerCase(),
  });
  const owners = (data.tokens || []).map((t) => t.ownerInfo.owner.toLowerCase());
  // Unique owners (addresses who delegated to this member)
  return Array.from(new Set(owners));
}

// Aggregated members list for the DAO
export type MemberListItem = {
  owner: string;
  delegate: string;
  tokens: number[];
  tokenCount: number;
  votesCount?: number;
  activeVotes?: number;
  // Percentage of non-canceled proposals the member voted on (0-100)
  attendancePct?: number;
  // Percentage of FOR votes among the member's cast votes (0-100)
  likePct?: number;
};

type DaoMembersPageQuery = {
  daotokenOwners: Array<{
    owner: string;
    delegate: string;
    daoTokenCount: number;
  }>;
};

const DAO_MEMBERS_LIST_GQL = /* GraphQL */ `
  query DaoMembersList($dao: ID!, $first: Int!, $skip: Int!) {
    daotokenOwners(
      where: { dao: $dao }
      orderBy: daoTokenCount
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      owner
      delegate
      daoTokenCount
    }
  }
`;

/**
 * Fetch all members (unique owners) of the DAO and aggregate their token counts.
 */
export async function fetchAllMembers(): Promise<MemberListItem[]> {
  const dao = GNARS_ADDRESSES.token.toLowerCase();
  const PAGE_SIZE = 1000;
  let skip = 0;
  const aggregated: MemberListItem[] = [];

  // Paginate through all tokens to aggregate by owner
  while (true) {
    const page = await subgraphQuery<DaoMembersPageQuery>(DAO_MEMBERS_LIST_GQL, {
      dao,
      first: PAGE_SIZE,
      skip,
    });
    const owners = page.daotokenOwners || [];
    if (owners.length === 0) break;

    for (const o of owners) {
      aggregated.push({
        owner: o.owner.toLowerCase(),
        delegate: (o.delegate || o.owner).toLowerCase(),
        tokenCount: Number(o.daoTokenCount ?? 0),
        tokens: [],
      });
    }

    if (owners.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return aggregated.sort((a, b) => {
    if (b.tokenCount !== a.tokenCount) return b.tokenCount - a.tokenCount;
    return a.owner.localeCompare(b.owner);
  });
}

type ActiveVotesBatchQuery = {
  daovoters: Array<{
    voter: string;
    daoTokenCount: number;
  }>;
};

const ACTIVE_VOTES_BATCH_GQL = /* GraphQL */ `
  query ActiveVotesBatch($dao: ID!, $voters: [Bytes!]!, $first: Int!, $skip: Int!) {
    daovoters(
      where: { dao: $dao, voter_in: $voters }
      orderBy: daoTokenCount
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      voter
      daoTokenCount
    }
  }
`;

export async function fetchActiveVotesForVoters(
  addresses: string[],
): Promise<Record<string, number>> {
  if (addresses.length === 0) return {};
  const dao = GNARS_ADDRESSES.token.toLowerCase();
  const counts: Record<string, number> = {};
  const unique = Array.from(new Set(addresses.map((a) => a.toLowerCase())));
  const PAGE = 1000;
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 100) chunks.push(unique.slice(i, i + 100));

  for (const voters of chunks) {
    let skip = 0;
    while (true) {
      const data = await subgraphQuery<ActiveVotesBatchQuery>(ACTIVE_VOTES_BATCH_GQL, {
        dao,
        voters,
        first: PAGE,
        skip,
      });
      const rows = data.daovoters || [];
      for (const row of rows) {
        counts[row.voter.toLowerCase()] = Number(row.daoTokenCount || 0);
      }
      if (rows.length < PAGE) break;
      skip += PAGE;
    }
  }

  return counts;
}

// Delegators with token counts
export type DelegatorWithCount = {
  owner: string;
  tokenCount: number;
};

type DelegatorsWithCountsQuery = {
  daotokenOwners: Array<{
    owner: string;
    daoTokenCount: number;
  }>;
};

const DELEGATORS_WITH_COUNTS_GQL = /* GraphQL */ `
  query DelegatorsWithCounts($dao: ID!, $delegate: Bytes!, $first: Int!, $skip: Int!) {
    daotokenOwners(
      where: { dao: $dao, delegate: $delegate }
      orderBy: daoTokenCount
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      owner
      daoTokenCount
    }
  }
`;

export async function fetchDelegatorsWithCounts(address: string): Promise<DelegatorWithCount[]> {
  const dao = GNARS_ADDRESSES.token.toLowerCase();
  const PAGE_SIZE = 1000;
  let skip = 0;
  const results: DelegatorWithCount[] = [];
  while (true) {
    const data = await subgraphQuery<DelegatorsWithCountsQuery>(DELEGATORS_WITH_COUNTS_GQL, {
      dao,
      delegate: address.toLowerCase(),
      first: PAGE_SIZE,
      skip,
    });
    const rows = data.daotokenOwners || [];
    if (rows.length === 0) break;
    for (const row of rows) {
      results.push({ owner: row.owner.toLowerCase(), tokenCount: Number(row.daoTokenCount || 0) });
    }
    if (rows.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return results;
}

type VotesCountBatchQuery = {
  proposalVotes: Array<{
    voter: string;
  }>;
};

const VOTES_COUNT_BATCH_GQL = /* GraphQL */ `
  query VotesCountBatch($dao: ID!, $voters: [Bytes!]!, $first: Int!, $skip: Int!) {
    proposalVotes(
      where: { proposal_: { dao: $dao }, voter_in: $voters }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      voter
    }
  }
`;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Fetch number of proposals voted per voter address (batch, chunked).
 */
export async function fetchVotesCountForVoters(
  addresses: string[],
): Promise<Record<string, number>> {
  if (addresses.length === 0) return {};
  const dao = GNARS_ADDRESSES.token.toLowerCase();
  const counts: Record<string, number> = {};
  const uniqueAddresses = Array.from(new Set(addresses.map((a) => a.toLowerCase())));
  const chunks = chunkArray(uniqueAddresses, 100);

  for (const voters of chunks) {
    let skip = 0;
    while (true) {
      const data = await subgraphQuery<VotesCountBatchQuery>(VOTES_COUNT_BATCH_GQL, {
        dao,
        voters,
        first: 1000,
        skip,
      });
      const votes = data.proposalVotes || [];
      for (const v of votes) {
        const key = v.voter.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
      if (votes.length < 1000) break;
      skip += 1000;
    }
  }

  return counts;
}

type VotesSupportBatchQuery = {
  proposalVotes: Array<{
    voter: string;
    support: "FOR" | "AGAINST" | "ABSTAIN";
  }>;
};

const VOTES_SUPPORT_BATCH_GQL = /* GraphQL */ `
  query VotesSupportBatch($dao: ID!, $voters: [Bytes!]!, $first: Int!, $skip: Int!) {
    proposalVotes(
      where: { proposal_: { dao: $dao, canceled: false }, voter_in: $voters }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      voter
      support
    }
  }
`;

/**
 * Fetch per-voter support counts (FOR vs total) excluding canceled proposals.
 */
export async function fetchVoteSupportForVoters(
  addresses: string[],
): Promise<Record<string, { total: number; forCount: number }>> {
  if (addresses.length === 0) return {};
  const dao = GNARS_ADDRESSES.token.toLowerCase();
  const supportMap: Record<string, { total: number; forCount: number }> = {};
  const uniqueAddresses = Array.from(new Set(addresses.map((a) => a.toLowerCase())));
  const chunks = chunkArray(uniqueAddresses, 100);

  for (const voters of chunks) {
    let skip = 0;
    while (true) {
      const data = await subgraphQuery<VotesSupportBatchQuery>(VOTES_SUPPORT_BATCH_GQL, {
        dao,
        voters,
        first: 1000,
        skip,
      });
      const votes = data.proposalVotes || [];
      for (const v of votes) {
        const key = v.voter.toLowerCase();
        const entry = (supportMap[key] ||= { total: 0, forCount: 0 });
        entry.total += 1;
        if (v.support === "FOR") entry.forCount += 1;
      }
      if (votes.length < 1000) break;
      skip += 1000;
    }
  }

  return supportMap;
}

type NonCanceledProposalsQuery = {
  proposals: Array<{
    id: string;
  }>;
};

const NON_CANCELED_PROPOSALS_GQL = /* GraphQL */ `
  query NonCanceledProposals($dao: ID!, $first: Int!, $skip: Int!) {
    proposals(
      where: { dao: $dao, canceled: false }
      orderBy: timeCreated
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
    }
  }
`;

/**
 * Count non-canceled proposals for the DAO.
 */
export async function fetchNonCanceledProposalsCount(): Promise<number> {
  const dao = GNARS_ADDRESSES.token.toLowerCase();
  const PAGE_SIZE = 1000;
  let skip = 0;
  let count = 0;
  while (true) {
    const data = await subgraphQuery<NonCanceledProposalsQuery>(NON_CANCELED_PROPOSALS_GQL, {
      dao,
      first: PAGE_SIZE,
      skip,
    });
    const rows = data.proposals || [];
    count += rows.length;
    if (rows.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return count;
}

// Active Members Service

export type ActiveMember = {
  address: string;
  votingPower: number;
  votesInWindow: number;
};

type VotesByProposalsQuery = {
  proposalVotes: Array<{
    voter: string;
    proposal: {
      id: string;
    };
  }>;
};

const VOTES_BY_PROPOSALS_GQL = /* GraphQL */ `
  query VotesByProposals($dao: ID!, $proposalIds: [String!]!, $first: Int!, $skip: Int!) {
    proposalVotes(
      where: { proposal_: { dao: $dao }, proposal_in: $proposalIds }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      voter
      proposal {
        id
      }
    }
  }
`;

type VotersByAddressesQuery = {
  daovoters: Array<{
    voter: string;
    daoTokenCount: number;
  }>;
};

const VOTERS_BY_ADDRESSES_GQL = /* GraphQL */ `
  query VotersByAddresses($dao: ID!, $voters: [Bytes!]!, $first: Int!, $skip: Int!) {
    daovoters(
      where: { dao: $dao, voter_in: $voters }
      orderBy: daoTokenCount
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      voter
      daoTokenCount
    }
  }
`;

/**
 * Fetch active members: voters who voted in at least `threshold` of the last `windowSize` non-canceled proposals.
 * Returns enriched list with address, votingPower (including delegated votes), and votesInWindow.
 */
export async function fetchActiveMembers(
  windowSize = 10,
  threshold = 5,
): Promise<ActiveMember[]> {
  const dao = GNARS_ADDRESSES.token.toLowerCase();

  // Step 1: Fetch last N non-canceled proposals
  const proposalsData = await subgraphQuery<NonCanceledProposalsQuery>(
    NON_CANCELED_PROPOSALS_GQL,
    {
      dao,
      first: windowSize,
      skip: 0,
    },
  );
  const proposals = proposalsData.proposals || [];
  
  if (proposals.length === 0) {
    return [];
  }

  const proposalIds = proposals.map((p) => p.id);

  // Step 2: Fetch all votes for these proposals (paginated)
  const voterProposalMap = new Map<string, Set<string>>();
  let skip = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const votesData = await subgraphQuery<VotesByProposalsQuery>(VOTES_BY_PROPOSALS_GQL, {
      dao,
      proposalIds,
      first: PAGE_SIZE,
      skip,
    });
    const votes = votesData.proposalVotes || [];

    for (const vote of votes) {
      const voter = vote.voter.toLowerCase();
      const proposalId = vote.proposal.id;
      
      if (!voterProposalMap.has(voter)) {
        voterProposalMap.set(voter, new Set());
      }
      voterProposalMap.get(voter)!.add(proposalId);
    }

    if (votes.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  // Step 3: Filter voters with >= threshold unique proposals voted
  const qualifiedVoters: Array<{ address: string; votesInWindow: number }> = [];
  for (const [voter, proposalSet] of voterProposalMap.entries()) {
    if (proposalSet.size >= threshold) {
      qualifiedVoters.push({ address: voter, votesInWindow: proposalSet.size });
    }
  }

  if (qualifiedVoters.length === 0) {
    return [];
  }

  // Step 4: Enrich with voting power (batched by 100)
  const addresses = qualifiedVoters.map((v) => v.address);
  const chunks = chunkArray(addresses, 100);
  const enrichmentMap = new Map<string, { votingPower: number }>();

  for (const voterChunk of chunks) {
    let chunkSkip = 0;
    while (true) {
      const votersData = await subgraphQuery<VotersByAddressesQuery>(VOTERS_BY_ADDRESSES_GQL, {
        dao,
        voters: voterChunk,
        first: 1000,
        skip: chunkSkip,
      });
      const voters = votersData.daovoters || [];

      for (const voter of voters) {
        enrichmentMap.set(voter.voter.toLowerCase(), {
          votingPower: Number(voter.daoTokenCount || 0),
        });
      }

      if (voters.length < 1000) break;
      chunkSkip += 1000;
    }
  }

  // Step 5: Build final list with defaults for missing enrichment, filter out 0 voting power
  const result: ActiveMember[] = qualifiedVoters
    .map((v) => {
      const enrichment = enrichmentMap.get(v.address) || {
        votingPower: 0,
      };
      return {
        address: v.address,
        votingPower: enrichment.votingPower,
        votesInWindow: v.votesInWindow,
      };
    })
    .filter((member) => member.votingPower > 0); // Exclude members with 0 voting power

  // Step 6: Sort by votingPower desc, votesInWindow desc, address asc
  result.sort((a, b) => {
    if (b.votingPower !== a.votingPower) return b.votingPower - a.votingPower;
    if (b.votesInWindow !== a.votesInWindow) return b.votesInWindow - a.votesInWindow;
    return a.address.localeCompare(b.address);
  });

  return result;
}
