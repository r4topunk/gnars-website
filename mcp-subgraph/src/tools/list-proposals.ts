import { z } from "zod";
import type { ProposalRepository } from "../db/repository.js";
import type { ProposalStatus } from "../subgraph/types.js";

export const listProposalsSchema = z.object({
  status: z
    .enum([
      "PENDING",
      "ACTIVE",
      "CANCELLED",
      "DEFEATED",
      "SUCCEEDED",
      "QUEUED",
      "EXPIRED",
      "EXECUTED",
      "VETOED",
    ])
    .optional()
    .describe("Filter by proposal status"),
  limit: z.number().min(1).max(100).default(20).describe("Number of proposals to return"),
  offset: z.number().min(0).default(0).describe("Offset for pagination"),
  order: z.enum(["asc", "desc"]).default("desc").describe("Sort order by creation time"),
  format: z
    .enum(["json", "toon"])
    .default("json")
    .describe("Output format: 'json' (default) or 'toon' for ~40% token savings"),
});

export type ListProposalsInput = z.infer<typeof listProposalsSchema>;

export interface ListProposalsOutput {
  proposals: Array<{
    proposalNumber: number;
    title: string;
    status: string;
    proposer: string;
    forVotes: number;
    againstVotes: number;
    abstainVotes: number;
    quorumVotes: number;
    voteStart: string;
    voteEnd: string;
    timeCreated: number;
  }>;
  total: number;
  hasMore: boolean;
}

export function listProposals(
  repo: ProposalRepository,
  input: ListProposalsInput
): ListProposalsOutput {
  const { proposals, total } = repo.listProposals({
    status: input.status as ProposalStatus | undefined,
    limit: input.limit,
    offset: input.offset,
    order: input.order,
  });

  return {
    proposals: proposals.map((p) => ({
      proposalNumber: p.proposal_number,
      title: p.title,
      status: p.status,
      proposer: p.proposer,
      forVotes: p.for_votes,
      againstVotes: p.against_votes,
      abstainVotes: p.abstain_votes,
      quorumVotes: p.quorum_votes,
      voteStart: p.vote_start,
      voteEnd: p.vote_end,
      timeCreated: p.time_created,
    })),
    total,
    hasMore: input.offset + proposals.length < total,
  };
}
