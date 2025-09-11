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
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorumVotes: string;
  calldatas: string[];
  targets: string[];
  values: string[];
  signatures: string[];
  transactionHash: string;
  votes?: ProposalVote[];
}
