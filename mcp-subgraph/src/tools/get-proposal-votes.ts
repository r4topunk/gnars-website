import { z } from "zod";
import { subgraphClient } from "../subgraph/client.js";

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

export async function getProposalVotes(
  input: GetProposalVotesInput
): Promise<GetProposalVotesOutput | null> {
  // Resolve proposal number
  let proposalNumber: number;

  if (typeof input.proposalId === "number") {
    proposalNumber = input.proposalId;
  } else if (input.proposalId.startsWith("0x")) {
    // Fetch proposal by ID to get number
    const proposal = await subgraphClient.fetchProposalById(input.proposalId);
    if (!proposal) return null;
    proposalNumber = proposal.proposalNumber;
  } else {
    const num = parseInt(input.proposalId, 10);
    if (isNaN(num)) return null;
    proposalNumber = num;
  }

  // Fetch votes from subgraph
  // If filtering by support, we need to fetch more and filter client-side
  // since the subgraph doesn't support support filtering directly
  const fetchLimit = input.support ? 500 : input.limit;
  const fetchOffset = input.support ? 0 : input.offset;

  const votes = await subgraphClient.fetchVotes(proposalNumber, fetchLimit, fetchOffset);

  // Process votes
  let processedVotes = votes.map((v) => ({
    voter: v.voter,
    support: supportToString(v.support),
    weight: v.weight,
    reason: v.reason,
    timestamp: parseInt(v.timestamp, 10),
    transactionHash: v.transactionHash,
  }));

  // Calculate summary from all votes
  const summary = {
    totalVoters: processedVotes.length,
    forVoters: processedVotes.filter((v) => v.support === "FOR").length,
    againstVoters: processedVotes.filter((v) => v.support === "AGAINST").length,
    abstainVoters: processedVotes.filter((v) => v.support === "ABSTAIN").length,
  };

  // Apply support filter if specified
  if (input.support) {
    processedVotes = processedVotes.filter((v) => v.support === input.support);
  }

  // Get total before pagination
  const total = processedVotes.length;

  // Apply pagination for filtered results
  if (input.support) {
    processedVotes = processedVotes.slice(input.offset, input.offset + input.limit);
  }

  return {
    votes: processedVotes,
    summary,
    hasMore: input.offset + processedVotes.length < total,
  };
}
