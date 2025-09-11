import { Proposal as SdkProposal } from "@buildeross/sdk";
import { Proposal, ProposalStatus } from "@/components/proposals/types";

function getProposalStatus(state: unknown): ProposalStatus {
  if (typeof state === "number") {
    switch (state) {
      case 0:
        return ProposalStatus.PENDING;
      case 1:
        return ProposalStatus.ACTIVE;
      case 2:
        return ProposalStatus.CANCELLED;
      case 3:
        return ProposalStatus.DEFEATED;
      case 4:
        return ProposalStatus.SUCCEEDED;
      case 5:
        return ProposalStatus.QUEUED;
      case 6:
        return ProposalStatus.EXPIRED;
      case 7:
        return ProposalStatus.EXECUTED;
      case 8:
        return ProposalStatus.VETOED;
      default:
        return ProposalStatus.PENDING;
    }
  }

  const up = String(state).toUpperCase();
  switch (up) {
    case "PENDING":
      return ProposalStatus.PENDING;
    case "ACTIVE":
      return ProposalStatus.ACTIVE;
    case "SUCCEEDED":
      return ProposalStatus.SUCCEEDED;
    case "QUEUED":
      return ProposalStatus.QUEUED;
    case "EXECUTED":
      return ProposalStatus.EXECUTED;
    case "DEFEATED":
      return ProposalStatus.DEFEATED;
    case "CANCELED": // Note: SDK uses "CANCELED"
      return ProposalStatus.CANCELLED;
    case "VETOED":
      return ProposalStatus.VETOED;
    case "EXPIRED":
      return ProposalStatus.EXPIRED;
    default:
      return ProposalStatus.PENDING;
  }
}

export function mapProposal(p: SdkProposal): Proposal {
  const status = getProposalStatus(p.state);
  return {
    proposalId: String(p.proposalId),
    proposalNumber: Number(p.proposalNumber),
    title: p.title ?? "",
    description: p.description ?? "",
    proposer: p.proposer,
    status,
    forVotes: Number(p.forVotes ?? 0),
    againstVotes: Number(p.againstVotes ?? 0),
    abstainVotes: Number(p.abstainVotes ?? 0),
    quorumVotes: Number(p.quorumVotes ?? 0),
    voteStart: new Date(Number(p.voteStart ?? 0) * 1000).toISOString(),
    voteEnd: new Date(Number(p.voteEnd ?? 0) * 1000).toISOString(),
    expiresAt: p.expiresAt
      ? new Date(Number(p.expiresAt) * 1000).toISOString()
      : undefined,
    timeCreated: Number(p.timeCreated ?? 0),
    executed: Boolean(p.executedAt),
    canceled: Boolean(p.cancelTransactionHash),
    queued: status === ProposalStatus.QUEUED,
    vetoed: Boolean(p.vetoTransactionHash),
    transactionHash: p.transactionHash,
  };
}
