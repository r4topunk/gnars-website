import { getSubgraphUrl, config } from "../config.js";
import {
  PROPOSALS_QUERY,
  PROPOSAL_BY_NUMBER_QUERY,
  PROPOSAL_BY_ID_QUERY,
  VOTES_QUERY,
  RECENT_PROPOSALS_QUERY,
} from "./queries.js";
import type {
  SubgraphProposal,
  SubgraphVote,
  ProposalsQueryResponse,
  VotesQueryResponse,
} from "./types.js";

export class SubgraphError extends Error {
  constructor(
    message: string,
    public readonly query: string,
    public readonly variables?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SubgraphError";
  }
}

async function executeQuery<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const url = getSubgraphUrl();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new SubgraphError(
      `Subgraph request failed: ${response.status} ${response.statusText}`,
      query,
      variables
    );
  }

  const result = (await response.json()) as T & { errors?: Array<{ message: string }> };

  if ("errors" in result && result.errors && result.errors.length > 0) {
    throw new SubgraphError(
      `Subgraph query error: ${result.errors.map((e) => e.message).join(", ")}`,
      query,
      variables
    );
  }

  return result;
}

export async function fetchProposals(
  first: number = 20,
  skip: number = 0
): Promise<SubgraphProposal[]> {
  const result = await executeQuery<ProposalsQueryResponse>(PROPOSALS_QUERY, {
    daoAddress: config.daoAddress.toLowerCase(),
    first,
    skip,
  });

  return result.data.proposals;
}

export async function fetchProposalByNumber(
  proposalNumber: number
): Promise<SubgraphProposal | null> {
  const result = await executeQuery<ProposalsQueryResponse>(PROPOSAL_BY_NUMBER_QUERY, {
    daoAddress: config.daoAddress.toLowerCase(),
    proposalNumber,
  });

  return result.data.proposals[0] ?? null;
}

export async function fetchProposalById(proposalId: string): Promise<SubgraphProposal | null> {
  const result = await executeQuery<ProposalsQueryResponse>(PROPOSAL_BY_ID_QUERY, {
    proposalId: proposalId.toLowerCase(),
  });

  return result.data.proposals[0] ?? null;
}

export async function fetchVotes(
  proposalNumber: number,
  first: number = 50,
  skip: number = 0
): Promise<SubgraphVote[]> {
  const result = await executeQuery<VotesQueryResponse>(VOTES_QUERY, {
    daoAddress: config.daoAddress.toLowerCase(),
    proposalNumber,
    first,
    skip,
  });

  return result.data.proposalVotes;
}

export async function fetchRecentProposals(sinceTimestamp: number): Promise<SubgraphProposal[]> {
  const result = await executeQuery<ProposalsQueryResponse>(RECENT_PROPOSALS_QUERY, {
    daoAddress: config.daoAddress.toLowerCase(),
    since: sinceTimestamp.toString(),
  });

  return result.data.proposals;
}

// Export a client object for easier mocking in tests
export const subgraphClient = {
  fetchProposals,
  fetchProposalByNumber,
  fetchProposalById,
  fetchVotes,
  fetchRecentProposals,
};
