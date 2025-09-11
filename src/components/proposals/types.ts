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

export interface ProposalVote {
  voter: string;
  voterEnsName?: string;
  choice: "FOR" | "AGAINST" | "ABSTAIN";
  votes: string;
  transactionHash: string;
}

export interface Proposal {
  proposalId: string;
  proposalNumber: number;
  title: string;
  description: string;
  status: ProposalStatus;
  state:
    | "PENDING"
    | "ACTIVE"
    | "DEFEATED"
    | "SUCCEEDED"
    | "QUEUED"
    | "EXECUTED"
    | "CANCELED"
    | "VETOED";
  proposer: string;
  proposerEnsName?: string;
  createdAt: number;
  endBlock: number;
  snapshotBlock?: number;
  endDate?: Date;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorumVotes: number;
  calldatas: string[];
  targets: string[];
  values: string[];
  signatures: string[];
  transactionHash: string;
  votes?: ProposalVote[];
  voteStart: string;
  voteEnd: string;
  expiresAt?: string;
  timeCreated: number;
  executed: boolean;
  canceled: boolean;
  queued: boolean;
  vetoed: boolean;
}
