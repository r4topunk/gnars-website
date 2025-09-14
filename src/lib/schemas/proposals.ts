import { z } from "zod";

export enum ProposalStatus {
  PENDING = "Pending",
  ACTIVE = "Active",
  SUCCEEDED = "Succeeded",
  QUEUED = "Queued",
  EXECUTED = "Executed",
  DEFEATED = "Defeated",
  CANCELLED = "Cancelled",
  EXPIRED = "Expired",
  VETOED = "Vetoed",
}

export const proposalVoteSchema = z.object({
  voter: z.string(),
  voterEnsName: z.string().optional(),
  choice: z.enum(["FOR", "AGAINST", "ABSTAIN"]),
  votes: z.string(),
  transactionHash: z.string(),
});

export const proposalSchema = z.object({
  proposalId: z.string(),
  proposalNumber: z.number(),
  title: z.string(),
  description: z.string(),
  status: z.nativeEnum(ProposalStatus),
  proposer: z.string(),
  proposerEnsName: z.string().optional(),
  createdAt: z.number(),
  endBlock: z.number(),
  snapshotBlock: z.number().optional(),
  endDate: z
    .preprocess((arg) => {
      if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
    }, z.date())
    .optional(),
  forVotes: z.number(),
  againstVotes: z.number(),
  abstainVotes: z.number(),
  quorumVotes: z.number(),
  calldatas: z.array(z.string()),
  targets: z.array(z.string()),
  values: z.array(z.string()),
  signatures: z.array(z.string()),
  transactionHash: z.string(),
  votes: z.array(proposalVoteSchema).optional(),
  voteStart: z.string(), // ISO date string
  voteEnd: z.string(), // ISO date string
  expiresAt: z.string().optional(), // ISO date string
  timeCreated: z.number(),
});

export function getProposalStatus(state: unknown): ProposalStatus {
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
    case "CANCELED":
      return ProposalStatus.CANCELLED;
    case "VETOED":
      return ProposalStatus.VETOED;
    case "EXPIRED":
      return ProposalStatus.EXPIRED;
    default:
      return ProposalStatus.PENDING;
  }
}
