// Types for subgraph responses

export interface SubgraphProposal {
  id: string;
  proposalId: string;
  proposalNumber: number;
  title: string;
  description: string;
  proposer: string;
  timeCreated: string;
  voteStart: string;
  voteEnd: string;
  snapshotBlockNumber: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorumVotes: string;
  executed: boolean;
  canceled: boolean;
  vetoed: boolean;
  queued: boolean;
  transactionHash: string;
  executableFrom?: string;
  expiresAt?: string;
}

export interface SubgraphVote {
  id: string;
  voter: string;
  support: number; // 0 = Against, 1 = For, 2 = Abstain
  weight: string;
  reason: string | null;
  timestamp: string;
  transactionHash: string;
  proposal: {
    proposalNumber: number;
    title: string;
  };
}

export interface ProposalsQueryResponse {
  data: {
    proposals: SubgraphProposal[];
  };
  errors?: Array<{ message: string }>;
}

export interface VotesQueryResponse {
  data: {
    proposalVotes: SubgraphVote[];
  };
  errors?: Array<{ message: string }>;
}

// Status calculation based on proposal state
export type ProposalStatus =
  | "PENDING"
  | "ACTIVE"
  | "CANCELLED"
  | "DEFEATED"
  | "SUCCEEDED"
  | "QUEUED"
  | "EXPIRED"
  | "EXECUTED"
  | "VETOED";

export function calculateProposalStatus(proposal: SubgraphProposal): ProposalStatus {
  const now = Math.floor(Date.now() / 1000);
  const voteStart = parseInt(proposal.voteStart, 10);
  const voteEnd = parseInt(proposal.voteEnd, 10);

  if (proposal.vetoed) return "VETOED";
  if (proposal.canceled) return "CANCELLED";
  if (proposal.executed) return "EXECUTED";
  if (proposal.queued) return "QUEUED";

  if (now < voteStart) return "PENDING";
  if (now <= voteEnd) return "ACTIVE";

  // Voting ended - check result
  const forVotes = parseInt(proposal.forVotes, 10);
  const againstVotes = parseInt(proposal.againstVotes, 10);
  const quorum = parseInt(proposal.quorumVotes, 10);

  if (forVotes <= againstVotes) return "DEFEATED";
  if (forVotes < quorum) return "DEFEATED";

  // Check if expired (past execution window)
  if (proposal.expiresAt) {
    const expiresAt = parseInt(proposal.expiresAt, 10);
    if (now > expiresAt) return "EXPIRED";
  }

  return "SUCCEEDED";
}
