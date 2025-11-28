import { z } from "zod";
import type { ProposalRepository } from "../db/repository.js";

export const getProposalVotesSchema = z.object({
  proposalId: z
    .union([z.string(), z.number()])
    .describe("Proposal ID (hex string) or proposal number"),
  support: z
    .enum(["FOR", "AGAINST", "ABSTAIN"])
    .optional()
    .describe("Filter by vote type"),
  limit: z.number().min(1).max(200).default(50).describe("Number of votes to return"),
  offset: z.number().min(0).default(0).describe("Offset for pagination"),
  format: z
    .enum(["json", "toon"])
    .default("json")
    .describe("Output format: 'json' (default) or 'toon' for ~40% token savings"),
});

export type GetProposalVotesInput = z.infer<typeof getProposalVotesSchema>;

export interface GetProposalVotesOutput {
  votes: Array<{
    voter: string;
    support: "FOR" | "AGAINST" | "ABSTAIN";
    weight: string;
    reason: string | null;
    timestamp: number;
    transactionHash: string | null;
  }>;
  summary: {
    totalVoters: number;
    forVoters: number;
    againstVoters: number;
    abstainVoters: number;
  };
  hasMore: boolean;
}

function supportToString(support: number): "FOR" | "AGAINST" | "ABSTAIN" {
  switch (support) {
    case 0:
      return "AGAINST";
    case 1:
      return "FOR";
    case 2:
      return "ABSTAIN";
    default:
      return "ABSTAIN";
  }
}

function supportFromString(support: string): 0 | 1 | 2 | undefined {
  switch (support) {
    case "AGAINST":
      return 0;
    case "FOR":
      return 1;
    case "ABSTAIN":
      return 2;
    default:
      return undefined;
  }
}

export function getProposalVotes(
  repo: ProposalRepository,
  input: GetProposalVotesInput
): GetProposalVotesOutput | null {
  // Resolve proposal number
  let proposalNumber: number;

  if (typeof input.proposalId === "number") {
    proposalNumber = input.proposalId;
  } else if (input.proposalId.startsWith("0x")) {
    const proposal = repo.getProposalById(input.proposalId);
    if (!proposal) return null;
    proposalNumber = proposal.proposal_number;
  } else {
    const num = parseInt(input.proposalId, 10);
    if (isNaN(num)) return null;
    proposalNumber = num;
  }

  // Check proposal exists
  const proposal = repo.getProposalByNumber(proposalNumber);
  if (!proposal) return null;

  const supportFilter = input.support ? supportFromString(input.support) : undefined;

  const { votes, total } = repo.getVotes({
    proposalNumber,
    support: supportFilter,
    limit: input.limit,
    offset: input.offset,
  });

  const summary = repo.getVoteSummary(proposalNumber);

  return {
    votes: votes.map((v) => ({
      voter: v.voter,
      support: supportToString(v.support),
      weight: v.weight,
      reason: v.reason,
      timestamp: v.timestamp,
      transactionHash: v.transaction_hash,
    })),
    summary,
    hasMore: input.offset + votes.length < total,
  };
}
