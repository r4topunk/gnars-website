// Database schema definitions

export const SCHEMA = `
-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  proposal_number INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  proposer TEXT NOT NULL,
  status TEXT NOT NULL,
  time_created INTEGER NOT NULL,
  vote_start TEXT NOT NULL,
  vote_end TEXT NOT NULL,
  snapshot_block TEXT,
  for_votes INTEGER DEFAULT 0,
  against_votes INTEGER DEFAULT 0,
  abstain_votes INTEGER DEFAULT 0,
  quorum_votes INTEGER DEFAULT 0,
  executed INTEGER DEFAULT 0,
  canceled INTEGER DEFAULT 0,
  vetoed INTEGER DEFAULT 0,
  queued INTEGER DEFAULT 0,
  transaction_hash TEXT,
  expires_at TEXT,
  executable_from TEXT,
  updated_at INTEGER NOT NULL
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  proposal_number INTEGER NOT NULL,
  voter TEXT NOT NULL,
  support INTEGER NOT NULL,
  weight TEXT NOT NULL,
  reason TEXT,
  timestamp INTEGER NOT NULL,
  transaction_hash TEXT,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id)
);

-- Sync metadata table
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Embeddings table (for semantic search)
CREATE TABLE IF NOT EXISTS embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  chunk_text TEXT NOT NULL,
  embedding BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id),
  UNIQUE(proposal_id, chunk_index)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_time ON proposals(time_created DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_number ON proposals(proposal_number);
CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter);
CREATE INDEX IF NOT EXISTS idx_votes_proposal_number ON votes(proposal_number);
CREATE INDEX IF NOT EXISTS idx_embeddings_proposal ON embeddings(proposal_id);
`;

export interface DbProposal {
  id: string;
  proposal_number: number;
  title: string;
  description: string;
  proposer: string;
  status: string;
  time_created: number;
  vote_start: string;
  vote_end: string;
  snapshot_block: string | null;
  for_votes: number;
  against_votes: number;
  abstain_votes: number;
  quorum_votes: number;
  executed: number;
  canceled: number;
  vetoed: number;
  queued: number;
  transaction_hash: string | null;
  expires_at: string | null;
  executable_from: string | null;
  updated_at: number;
}

export interface DbVote {
  id: string;
  proposal_id: string;
  proposal_number: number;
  voter: string;
  support: number;
  weight: string;
  reason: string | null;
  timestamp: number;
  transaction_hash: string | null;
}

export interface DbEmbedding {
  id: number;
  proposal_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding: Buffer;
  created_at: number;
}
