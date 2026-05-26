export type RoundStatus = "draft" | "published" | "archived";
export type RoundSubmissionStatus = "pending" | "approved" | "rejected" | "hidden";
export type RoundVotingStrategy = "one_per_wallet" | "one_per_nft" | "fixed_per_wallet";

export type RoundState =
  | "draft"
  | "upcoming"
  | "submissions_open"
  | "voting_open"
  | "ended"
  | "archived";

export interface RoundAward {
  id: string;
  roundId: string;
  position: number;
  title: string;
  description: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoundSubmission {
  id: string;
  roundId: string;
  walletAddress: string;
  title: string;
  description: string;
  image: string;
  url: string;
  status: RoundSubmissionStatus;
  createdAt: string;
  updatedAt: string;
  voteCount: number;
  winnerPosition: number | null;
}

export interface RoundVoteActivity {
  id: string;
  walletAddress: string;
  submissionId: string;
  submissionTitle: string;
  voteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Round {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  image: string;
  startsAt: string;
  submissionsOpenAt: string;
  votingStartsAt: string;
  votingEndsAt: string;
  endsAt: string;
  active: boolean;
  featured: boolean;
  status: RoundStatus;
  votingStrategy: RoundVotingStrategy;
  votesPerWallet: number;
  winnerCount: number;
  maxSubmissionsPerWallet: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  approvedSubmissionCount?: number;
  submissionCount?: number;
  totalVotes?: number;
  awards?: RoundAward[];
}

export type RoundWithSubmissions = Round & {
  submissions: RoundSubmission[];
  voteActivity: RoundVoteActivity[];
};

export interface RoundSubmissionInput {
  walletAddress: string;
  title: string;
  description: string;
  image: string;
  url?: string;
}

export interface RoundVoteAllocationInput {
  submissionId: string;
  voteCount: number;
}
