import { z } from "zod";
import { subgraphClient } from "../subgraph/client.js";
import { calculateProposalStatus } from "../subgraph/types.js";

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

export async function listProposals(input: ListProposalsInput): Promise<ListProposalsOutput> {
  // Fetch from subgraph directly
  // Note: Subgraph doesn't support status filtering, so we fetch more and filter client-side
  const fetchLimit = input.status ? 200 : input.limit;
  const fetchOffset = input.status ? 0 : input.offset;

  const proposals = await subgraphClient.fetchProposals(fetchLimit, fetchOffset);

  // Calculate status for each proposal and optionally filter
  let processedProposals = proposals.map((p) => ({
    proposalNumber: p.proposalNumber,
    title: p.title || "",
    status: calculateProposalStatus(p),
    proposer: p.proposer,
    forVotes: parseInt(p.forVotes, 10),
    againstVotes: parseInt(p.againstVotes, 10),
    abstainVotes: parseInt(p.abstainVotes, 10),
    quorumVotes: parseInt(p.quorumVotes, 10),
    voteStart: p.voteStart,
    voteEnd: p.voteEnd,
    timeCreated: parseInt(p.timeCreated, 10),
  }));

  // Apply status filter if specified
  if (input.status) {
    processedProposals = processedProposals.filter((p) => p.status === input.status);
  }

  // Apply order (subgraph returns desc by default)
  if (input.order === "asc") {
    processedProposals.reverse();
  }

  // Get total before pagination
  const total = processedProposals.length;

  // Apply pagination for status-filtered results
  if (input.status) {
    processedProposals = processedProposals.slice(input.offset, input.offset + input.limit);
  }

  return {
    proposals: processedProposals,
    total,
    hasMore: input.offset + processedProposals.length < total,
  };
}
