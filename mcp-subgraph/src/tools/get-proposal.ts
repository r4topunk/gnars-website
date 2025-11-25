import { z } from "zod";
import type { ProposalRepository } from "../db/repository.js";
import type { DbProposal } from "../db/schema.js";

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

function computeResult(proposal: DbProposal): "PASSING" | "FAILING" | "TIE" | null {
  // Only compute result for active or completed proposals
  if (["PENDING", "CANCELLED", "VETOED"].includes(proposal.status)) {
    return null;
  }

  if (proposal.for_votes > proposal.against_votes) {
    return "PASSING";
  } else if (proposal.against_votes > proposal.for_votes) {
    return "FAILING";
  } else if (proposal.for_votes === proposal.against_votes && proposal.for_votes > 0) {
    return "TIE";
  }

  return null;
}

function computeParticipation(proposal: DbProposal): string {
  const totalVotes = proposal.for_votes + proposal.against_votes + proposal.abstain_votes;
  if (proposal.quorum_votes === 0) {
    return "N/A";
  }
  const percentage = (totalVotes / proposal.quorum_votes) * 100;
  return `${percentage.toFixed(1)}% of quorum`;
}

export function getProposal(
  repo: ProposalRepository,
  input: GetProposalInput
): GetProposalOutput | null {
  let proposal: DbProposal | null = null;

  if (typeof input.id === "number") {
    proposal = repo.getProposalByNumber(input.id);
  } else if (input.id.startsWith("0x")) {
    proposal = repo.getProposalById(input.id);
  } else {
    // Try parsing as number
    const num = parseInt(input.id, 10);
    if (!isNaN(num)) {
      proposal = repo.getProposalByNumber(num);
    }
  }

  if (!proposal) {
    return null;
  }

  const totalVotes = proposal.for_votes + proposal.against_votes + proposal.abstain_votes;

  return {
    proposalId: proposal.id,
    proposalNumber: proposal.proposal_number,
    title: proposal.title,
    description: proposal.description,
    status: proposal.status,
    proposer: proposal.proposer,
    forVotes: proposal.for_votes,
    againstVotes: proposal.against_votes,
    abstainVotes: proposal.abstain_votes,
    quorumVotes: proposal.quorum_votes,
    voteStart: proposal.vote_start,
    voteEnd: proposal.vote_end,
    timeCreated: proposal.time_created,
    executed: proposal.executed === 1,
    canceled: proposal.canceled === 1,
    vetoed: proposal.vetoed === 1,
    queued: proposal.queued === 1,
    transactionHash: proposal.transaction_hash,
    totalVotes,
    participationRate: computeParticipation(proposal),
    result: computeResult(proposal),
  };
}
