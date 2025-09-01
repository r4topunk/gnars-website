import { GNARS_ADDRESSES } from "@/lib/config";
import { subgraphQuery } from "@/lib/subgraph";

export type MemberOverview = {
  address: string;
  delegate: string;
  tokensHeld: number[];
  tokenCount: number;
  tokens: Array<{ id: number; imageUrl?: string | null }>;
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
  }>;
};

const MEMBER_TOKENS_GQL = /* GraphQL */ `
  query MemberTokens($dao: ID!, $owner: Bytes!) {
    tokens(where: { dao: $dao, owner: $owner }, orderBy: tokenId, orderDirection: asc) {
      tokenId
      ownerInfo { owner delegate }
      image
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
  const tokens = (tokensData.tokens || []).map((t) => ({ id: Number(t.tokenId), imageUrl: t.image ?? undefined }));

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
    tokens(
      where: { dao: $dao, ownerInfo_: { delegate: $delegate } }
      first: 1000
    ) {
      ownerInfo { owner delegate }
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


