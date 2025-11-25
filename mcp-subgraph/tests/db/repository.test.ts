import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { ProposalRepository } from "../../src/db/repository.js";
import { SCHEMA } from "../../src/db/schema.js";
import { mockProposal, mockProposalExecuted, mockVotes } from "../fixtures/proposals.js";

describe("ProposalRepository", () => {
  let db: Database.Database;
  let repo: ProposalRepository;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
    repo = new ProposalRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("proposals", () => {
    it("should insert and retrieve a proposal", () => {
      repo.upsertProposal(mockProposal);

      const retrieved = repo.getProposalByNumber(42);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.proposal_number).toBe(42);
      expect(retrieved?.title).toBe("Sponsor Skater X for Olympics");
      expect(retrieved?.proposer).toBe("0xabcdef1234567890abcdef1234567890abcdef12");
    });

    it("should update proposal on conflict", () => {
      repo.upsertProposal(mockProposal);

      const updatedProposal = {
        ...mockProposal,
        forVotes: "100",
        againstVotes: "50",
      };
      repo.upsertProposal(updatedProposal);

      const retrieved = repo.getProposalByNumber(42);
      expect(retrieved?.for_votes).toBe(100);
      expect(retrieved?.against_votes).toBe(50);
    });

    it("should get proposal by ID", () => {
      repo.upsertProposal(mockProposal);

      const retrieved = repo.getProposalById(mockProposal.proposalId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.proposal_number).toBe(42);
    });

    it("should return null for non-existent proposal", () => {
      const byNumber = repo.getProposalByNumber(999);
      const byId = repo.getProposalById("0xnonexistent");

      expect(byNumber).toBeNull();
      expect(byId).toBeNull();
    });

    it("should bulk upsert proposals", () => {
      const count = repo.upsertProposals([mockProposal, mockProposalExecuted]);

      expect(count).toBe(2);

      const { proposals, total } = repo.listProposals();
      expect(total).toBe(2);
      expect(proposals).toHaveLength(2);
    });

    it("should list proposals with pagination", () => {
      repo.upsertProposals([mockProposal, mockProposalExecuted]);

      const page1 = repo.listProposals({ limit: 1, offset: 0 });
      const page2 = repo.listProposals({ limit: 1, offset: 1 });

      expect(page1.total).toBe(2);
      expect(page1.proposals).toHaveLength(1);
      expect(page2.proposals).toHaveLength(1);
      expect(page1.proposals[0].proposal_number).not.toBe(page2.proposals[0].proposal_number);
    });

    it("should filter proposals by status", () => {
      repo.upsertProposals([mockProposal, mockProposalExecuted]);

      const executed = repo.listProposals({ status: "EXECUTED" });

      expect(executed.total).toBe(1);
      expect(executed.proposals[0].proposal_number).toBe(38);
    });
  });

  describe("votes", () => {
    beforeEach(() => {
      // Need to insert proposal first due to foreign key
      repo.upsertProposal(mockProposal);
    });

    it("should insert and retrieve votes", () => {
      repo.upsertVotes(mockVotes, mockProposal.proposalId);

      const { votes, total } = repo.getVotes({ proposalNumber: 42 });

      expect(total).toBe(4);
      expect(votes).toHaveLength(4);
    });

    it("should filter votes by support type", () => {
      repo.upsertVotes(mockVotes, mockProposal.proposalId);

      const forVotes = repo.getVotes({ proposalNumber: 42, support: 1 });
      const againstVotes = repo.getVotes({ proposalNumber: 42, support: 0 });
      const abstainVotes = repo.getVotes({ proposalNumber: 42, support: 2 });

      expect(forVotes.total).toBe(2);
      expect(againstVotes.total).toBe(1);
      expect(abstainVotes.total).toBe(1);
    });

    it("should get vote summary", () => {
      repo.upsertVotes(mockVotes, mockProposal.proposalId);

      const summary = repo.getVoteSummary(42);

      expect(summary.totalVoters).toBe(4);
      expect(summary.forVoters).toBe(2);
      expect(summary.againstVoters).toBe(1);
      expect(summary.abstainVoters).toBe(1);
    });

    it("should paginate votes", () => {
      repo.upsertVotes(mockVotes, mockProposal.proposalId);

      const page1 = repo.getVotes({ proposalNumber: 42, limit: 2, offset: 0 });
      const page2 = repo.getVotes({ proposalNumber: 42, limit: 2, offset: 2 });

      expect(page1.total).toBe(4);
      expect(page1.votes).toHaveLength(2);
      expect(page2.votes).toHaveLength(2);
    });
  });

  describe("sync metadata", () => {
    it("should set and get last sync time", () => {
      const timestamp = Math.floor(Date.now() / 1000);

      repo.setLastSyncTime(timestamp);
      const retrieved = repo.getLastSyncTime();

      expect(retrieved).toBe(timestamp);
    });

    it("should return null if no sync has occurred", () => {
      const retrieved = repo.getLastSyncTime();
      expect(retrieved).toBeNull();
    });

    it("should update last sync time", () => {
      repo.setLastSyncTime(1000);
      repo.setLastSyncTime(2000);

      const retrieved = repo.getLastSyncTime();
      expect(retrieved).toBe(2000);
    });
  });
});
