import { z } from "zod";
import { subgraphClient } from "../subgraph/client.js";
import { calculateProposalStatus, type SubgraphProposal } from "../subgraph/types.js";

export const getProposalSchema = z.object({
  id: z.union([z.string(), z.number()]).describe("Proposal ID (hex string) or proposal number"),
});

export type GetProposalInput = z.infer<typeof getProposalSchema>;

export interface GetProposalOutput {
  proposalId: string;
  proposalNumber: number;
  title: string;
  description: string;
  status: string;
  proposer: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorumVotes: number;
  voteStart: string;
  voteEnd: string;
  timeCreated: number;
  executed: boolean;
  canceled: boolean;
  vetoed: boolean;
  queued: boolean;
  transactionHash: string | null;
  // Computed fields
  totalVotes: number;
  participationRate: string;
  result: "PASSING" | "FAILING" | "TIE" | null;
}

function computeResult(proposal: SubgraphProposal): "PASSING" | "FAILING" | "TIE" | null {
  const status = calculateProposalStatus(proposal);

  // Only compute result for active or completed proposals
  if (["PENDING", "CANCELLED", "VETOED"].includes(status)) {
    return null;
  }

  const forVotes = parseInt(proposal.forVotes, 10);
  const againstVotes = parseInt(proposal.againstVotes, 10);

  if (forVotes > againstVotes) {
    return "PASSING";
  } else if (againstVotes > forVotes) {
    return "FAILING";
  } else if (forVotes === againstVotes && forVotes > 0) {
    return "TIE";
  }

  return null;
}

function computeParticipation(proposal: SubgraphProposal): string {
  const forVotes = parseInt(proposal.forVotes, 10);
  const againstVotes = parseInt(proposal.againstVotes, 10);
  const abstainVotes = parseInt(proposal.abstainVotes, 10);
  const quorumVotes = parseInt(proposal.quorumVotes, 10);

  const totalVotes = forVotes + againstVotes + abstainVotes;
  if (quorumVotes === 0) {
    return "N/A";
  }
  const percentage = (totalVotes / quorumVotes) * 100;
  return `${percentage.toFixed(1)}% of quorum`;
}

export async function getProposal(input: GetProposalInput): Promise<GetProposalOutput | null> {
  let proposal: SubgraphProposal | null = null;

  if (typeof input.id === "number") {
    proposal = await subgraphClient.fetchProposalByNumber(input.id);
  } else if (input.id.startsWith("0x")) {
    proposal = await subgraphClient.fetchProposalById(input.id);
  } else {
    // Try parsing as number
    const num = parseInt(input.id, 10);
    if (!isNaN(num)) {
      proposal = await subgraphClient.fetchProposalByNumber(num);
    }
  }

  if (!proposal) {
    return null;
  }

  const forVotes = parseInt(proposal.forVotes, 10);
  const againstVotes = parseInt(proposal.againstVotes, 10);
  const abstainVotes = parseInt(proposal.abstainVotes, 10);
  const totalVotes = forVotes + againstVotes + abstainVotes;

  return {
    proposalId: proposal.proposalId,
    proposalNumber: proposal.proposalNumber,
    title: proposal.title || "",
    description: proposal.description || "",
    status: calculateProposalStatus(proposal),
    proposer: proposal.proposer,
    forVotes,
    againstVotes,
    abstainVotes,
    quorumVotes: parseInt(proposal.quorumVotes, 10),
    voteStart: proposal.voteStart,
    voteEnd: proposal.voteEnd,
    timeCreated: parseInt(proposal.timeCreated, 10),
    executed: proposal.executed,
    canceled: proposal.canceled,
    vetoed: proposal.vetoed,
    queued: proposal.queued,
    transactionHash: proposal.transactionHash,
    totalVotes,
    participationRate: computeParticipation(proposal),
    result: computeResult(proposal),
  };
}
