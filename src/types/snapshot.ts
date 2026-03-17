export interface SnapshotProposal {
  id: string;
  title: string;
  body: string;
  choices: string[];
  start: number;
  end: number;
  snapshot: number;
  state: "pending" | "active" | "closed";
  space: {
    id: string;
    name: string;
  };
  author: string;
  scores: number[];
  scores_total: number;
  votes: number;
  created: number;
}

export interface SnapshotProposalsResponse {
  data: {
    proposals: SnapshotProposal[];
  };
}
