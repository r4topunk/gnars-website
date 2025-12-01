import type Database from "better-sqlite3";
import type { DbProposal, DbVote } from "./schema.js";
import type { SubgraphProposal, SubgraphVote, ProposalStatus } from "../subgraph/types.js";
import { calculateProposalStatus } from "../subgraph/types.js";

// Helper to convert number array to Buffer for SQLite
function embeddingToBuffer(embedding: number[]): Buffer {
  const float32Array = new Float32Array(embedding);
  return Buffer.from(float32Array.buffer);
}

// Helper to convert Buffer back to number array
function bufferToEmbedding(buffer: Buffer): number[] {
  const float32Array = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
  return Array.from(float32Array);
}

export class ProposalRepository {
  constructor(private db: Database.Database) {}

  // Convert subgraph proposal to database format
  private toDbProposal(proposal: SubgraphProposal): DbProposal {
    return {
      id: proposal.proposalId,
      proposal_number: proposal.proposalNumber,
      title: proposal.title || "",
      description: proposal.description || "",
      proposer: proposal.proposer,
      status: calculateProposalStatus(proposal),
      time_created: parseInt(proposal.timeCreated, 10),
      vote_start: proposal.voteStart,
      vote_end: proposal.voteEnd,
      snapshot_block: proposal.snapshotBlockNumber,
      for_votes: parseInt(proposal.forVotes, 10),
      against_votes: parseInt(proposal.againstVotes, 10),
      abstain_votes: parseInt(proposal.abstainVotes, 10),
      quorum_votes: parseInt(proposal.quorumVotes, 10),
      executed: proposal.executed ? 1 : 0,
      canceled: proposal.canceled ? 1 : 0,
      vetoed: proposal.vetoed ? 1 : 0,
      queued: proposal.queued ? 1 : 0,
      transaction_hash: proposal.transactionHash,
      expires_at: proposal.expiresAt ?? null,
      executable_from: proposal.executableFrom ?? null,
      updated_at: Math.floor(Date.now() / 1000),
    };
  }

  // Upsert a proposal
  upsertProposal(proposal: SubgraphProposal): void {
    const dbProposal = this.toDbProposal(proposal);

    const stmt = this.db.prepare(`
      INSERT INTO proposals (
        id, proposal_number, title, description, proposer, status,
        time_created, vote_start, vote_end, snapshot_block,
        for_votes, against_votes, abstain_votes, quorum_votes,
        executed, canceled, vetoed, queued, transaction_hash,
        expires_at, executable_from, updated_at
      ) VALUES (
        @id, @proposal_number, @title, @description, @proposer, @status,
        @time_created, @vote_start, @vote_end, @snapshot_block,
        @for_votes, @against_votes, @abstain_votes, @quorum_votes,
        @executed, @canceled, @vetoed, @queued, @transaction_hash,
        @expires_at, @executable_from, @updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        status = @status,
        for_votes = @for_votes,
        against_votes = @against_votes,
        abstain_votes = @abstain_votes,
        executed = @executed,
        canceled = @canceled,
        vetoed = @vetoed,
        queued = @queued,
        expires_at = @expires_at,
        executable_from = @executable_from,
        updated_at = @updated_at
    `);

    stmt.run(dbProposal);
  }

  // Bulk upsert proposals
  upsertProposals(proposals: SubgraphProposal[]): number {
    const upsert = this.db.transaction((props: SubgraphProposal[]) => {
      for (const proposal of props) {
        this.upsertProposal(proposal);
      }
      return props.length;
    });

    return upsert(proposals);
  }

  // Get proposal by ID (hex)
  getProposalById(id: string): DbProposal | null {
    const stmt = this.db.prepare("SELECT * FROM proposals WHERE id = ?");
    return (stmt.get(id) as DbProposal) ?? null;
  }

  // Get proposal by number
  getProposalByNumber(proposalNumber: number): DbProposal | null {
    const stmt = this.db.prepare("SELECT * FROM proposals WHERE proposal_number = ?");
    return (stmt.get(proposalNumber) as DbProposal) ?? null;
  }

  // List proposals with optional filtering
  listProposals(options: {
    status?: ProposalStatus;
    limit?: number;
    offset?: number;
    order?: "asc" | "desc";
  } = {}): { proposals: DbProposal[]; total: number } {
    const { status, limit = 20, offset = 0, order = "desc" } = options;

    let countQuery = "SELECT COUNT(*) as count FROM proposals";
    let selectQuery = `SELECT * FROM proposals`;

    const params: unknown[] = [];

    if (status) {
      countQuery += " WHERE status = ?";
      selectQuery += " WHERE status = ?";
      params.push(status);
    }

    selectQuery += ` ORDER BY time_created ${order === "asc" ? "ASC" : "DESC"}`;
    selectQuery += " LIMIT ? OFFSET ?";

    const countStmt = this.db.prepare(countQuery);
    const countResult = status
      ? (countStmt.get(status) as { count: number })
      : (countStmt.get() as { count: number });
    const total = countResult.count;

    const selectStmt = this.db.prepare(selectQuery);
    const proposals = selectStmt.all(...params, limit, offset) as DbProposal[];

    return { proposals, total };
  }

  // Upsert a vote
  upsertVote(vote: SubgraphVote, proposalId: string): void {
    const dbVote: DbVote = {
      id: vote.id,
      proposal_id: proposalId,
      proposal_number: vote.proposal.proposalNumber,
      voter: vote.voter,
      support: vote.support,
      weight: vote.weight,
      reason: vote.reason,
      timestamp: parseInt(vote.timestamp, 10),
      transaction_hash: vote.transactionHash,
    };

    const stmt = this.db.prepare(`
      INSERT INTO votes (
        id, proposal_id, proposal_number, voter, support, weight, reason, timestamp, transaction_hash
      ) VALUES (
        @id, @proposal_id, @proposal_number, @voter, @support, @weight, @reason, @timestamp, @transaction_hash
      )
      ON CONFLICT(id) DO UPDATE SET
        weight = @weight,
        reason = @reason
    `);

    stmt.run(dbVote);
  }

  // Bulk upsert votes
  upsertVotes(votes: SubgraphVote[], proposalId: string): number {
    const upsert = this.db.transaction((v: SubgraphVote[]) => {
      for (const vote of v) {
        this.upsertVote(vote, proposalId);
      }
      return v.length;
    });

    return upsert(votes);
  }

  // Get votes for a proposal
  getVotes(options: {
    proposalNumber: number;
    support?: 0 | 1 | 2;
    limit?: number;
    offset?: number;
  }): { votes: DbVote[]; total: number } {
    const { proposalNumber, support, limit = 50, offset = 0 } = options;

    let countQuery = "SELECT COUNT(*) as count FROM votes WHERE proposal_number = ?";
    let selectQuery = "SELECT * FROM votes WHERE proposal_number = ?";

    const params: unknown[] = [proposalNumber];

    if (support !== undefined) {
      countQuery += " AND support = ?";
      selectQuery += " AND support = ?";
      params.push(support);
    }

    selectQuery += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";

    const countStmt = this.db.prepare(countQuery);
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult.count;

    const selectStmt = this.db.prepare(selectQuery);
    const votes = selectStmt.all(...params, limit, offset) as DbVote[];

    return { votes, total };
  }

  // Get vote summary for a proposal
  getVoteSummary(proposalNumber: number): {
    totalVoters: number;
    forVoters: number;
    againstVoters: number;
    abstainVoters: number;
  } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as totalVoters,
        SUM(CASE WHEN support = 1 THEN 1 ELSE 0 END) as forVoters,
        SUM(CASE WHEN support = 0 THEN 1 ELSE 0 END) as againstVoters,
        SUM(CASE WHEN support = 2 THEN 1 ELSE 0 END) as abstainVoters
      FROM votes WHERE proposal_number = ?
    `);

    const result = stmt.get(proposalNumber) as {
      totalVoters: number;
      forVoters: number;
      againstVoters: number;
      abstainVoters: number;
    };

    return result;
  }

  // Sync metadata
  getLastSyncTime(): number | null {
    const stmt = this.db.prepare("SELECT value FROM sync_metadata WHERE key = 'last_sync'");
    const result = stmt.get() as { value: string } | undefined;
    return result ? parseInt(result.value, 10) : null;
  }

  setLastSyncTime(timestamp: number): void {
    const stmt = this.db.prepare(`
      INSERT INTO sync_metadata (key, value) VALUES ('last_sync', @value)
      ON CONFLICT(key) DO UPDATE SET value = @value
    `);
    stmt.run({ value: timestamp.toString() });
  }

  // ===== Embedding methods =====

  // Upsert embedding for a proposal chunk
  upsertEmbedding(
    proposalId: string,
    chunkIndex: number,
    chunkText: string,
    embedding: number[]
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO embeddings (proposal_id, chunk_index, chunk_text, embedding, created_at)
      VALUES (@proposal_id, @chunk_index, @chunk_text, @embedding, @created_at)
      ON CONFLICT(proposal_id, chunk_index) DO UPDATE SET
        chunk_text = @chunk_text,
        embedding = @embedding,
        created_at = @created_at
    `);

    stmt.run({
      proposal_id: proposalId,
      chunk_index: chunkIndex,
      chunk_text: chunkText,
      embedding: embeddingToBuffer(embedding),
      created_at: Math.floor(Date.now() / 1000),
    });
  }

  // Delete all embeddings for a proposal
  deleteEmbeddings(proposalId: string): void {
    const stmt = this.db.prepare("DELETE FROM embeddings WHERE proposal_id = ?");
    stmt.run(proposalId);
  }

  // Check if proposal has embeddings
  hasEmbeddings(proposalId: string): boolean {
    const stmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM embeddings WHERE proposal_id = ?"
    );
    const result = stmt.get(proposalId) as { count: number };
    return result.count > 0;
  }

  // Get all embeddings with their proposal info
  getAllEmbeddings(): Array<{
    proposalId: string;
    proposalNumber: number;
    title: string;
    status: string;
    chunkIndex: number;
    chunkText: string;
    embedding: number[];
  }> {
    const stmt = this.db.prepare(`
      SELECT
        e.proposal_id,
        e.chunk_index,
        e.chunk_text,
        e.embedding,
        p.proposal_number,
        p.title,
        p.status
      FROM embeddings e
      JOIN proposals p ON e.proposal_id = p.id
      ORDER BY p.proposal_number DESC, e.chunk_index ASC
    `);

    const rows = stmt.all() as Array<{
      proposal_id: string;
      chunk_index: number;
      chunk_text: string;
      embedding: Buffer;
      proposal_number: number;
      title: string;
      status: string;
    }>;

    return rows.map((row) => ({
      proposalId: row.proposal_id,
      proposalNumber: row.proposal_number,
      title: row.title,
      status: row.status,
      chunkIndex: row.chunk_index,
      chunkText: row.chunk_text,
      embedding: bufferToEmbedding(row.embedding),
    }));
  }

  // Get proposals without embeddings
  getProposalsWithoutEmbeddings(): DbProposal[] {
    const stmt = this.db.prepare(`
      SELECT p.* FROM proposals p
      LEFT JOIN embeddings e ON p.id = e.proposal_id
      WHERE e.id IS NULL
    `);
    return stmt.all() as DbProposal[];
  }

  // Get embedding stats
  getEmbeddingStats(): { totalProposals: number; embeddedProposals: number; totalChunks: number } {
    const proposalCount = this.db.prepare("SELECT COUNT(*) as count FROM proposals").get() as {
      count: number;
    };
    const embeddedCount = this.db.prepare(
      "SELECT COUNT(DISTINCT proposal_id) as count FROM embeddings"
    ).get() as { count: number };
    const chunkCount = this.db.prepare("SELECT COUNT(*) as count FROM embeddings").get() as {
      count: number;
    };

    return {
      totalProposals: proposalCount.count,
      embeddedProposals: embeddedCount.count,
      totalChunks: chunkCount.count,
    };
  }
}
