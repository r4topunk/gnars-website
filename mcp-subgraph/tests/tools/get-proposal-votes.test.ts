import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { ProposalRepository } from "../../src/db/repository.js";
import { SCHEMA } from "../../src/db/schema.js";
import { getProposalVotes } from "../../src/tools/get-proposal-votes.js";
import { mockProposal, mockVotes } from "../fixtures/proposals.js";

describe("getProposalVotes", () => {
  let db: Database.Database;
  let repo: ProposalRepository;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
    repo = new ProposalRepository(db);

    // Seed test data
    repo.upsertProposal(mockProposal);
    repo.upsertVotes(mockVotes, mockProposal.proposalId);
  });

  afterEach(() => {
    db.close();
  });

  it("should return votes for a proposal", () => {
    const result = getProposalVotes(repo, { proposalId: 42, limit: 50, offset: 0 });

    expect(result).not.toBeNull();
    expect(result?.votes).toHaveLength(4);
  });

  it("should filter by support type", () => {
    const forVotes = getProposalVotes(repo, { proposalId: 42, support: "FOR", limit: 50, offset: 0 });
    const againstVotes = getProposalVotes(repo, { proposalId: 42, support: "AGAINST", limit: 50, offset: 0 });
    const abstainVotes = getProposalVotes(repo, { proposalId: 42, support: "ABSTAIN", limit: 50, offset: 0 });

    expect(forVotes?.votes).toHaveLength(2);
    expect(againstVotes?.votes).toHaveLength(1);
    expect(abstainVotes?.votes).toHaveLength(1);
  });

  it("should include vote summary", () => {
    const result = getProposalVotes(repo, { proposalId: 42, limit: 50, offset: 0 });

    expect(result?.summary.totalVoters).toBe(4);
    expect(result?.summary.forVoters).toBe(2);
    expect(result?.summary.againstVoters).toBe(1);
    expect(result?.summary.abstainVoters).toBe(1);
  });

  it("should paginate votes", () => {
    const page1 = getProposalVotes(repo, { proposalId: 42, limit: 2, offset: 0 });
    const page2 = getProposalVotes(repo, { proposalId: 42, limit: 2, offset: 2 });

    expect(page1?.votes).toHaveLength(2);
    expect(page1?.hasMore).toBe(true);

    expect(page2?.votes).toHaveLength(2);
    expect(page2?.hasMore).toBe(false);
  });

  it("should return vote details", () => {
    const result = getProposalVotes(repo, { proposalId: 42, limit: 50, offset: 0 });
    const vote = result?.votes[0];

    expect(vote).toHaveProperty("voter");
    expect(vote).toHaveProperty("support");
    expect(vote).toHaveProperty("weight");
    expect(vote).toHaveProperty("reason");
    expect(vote).toHaveProperty("timestamp");
    expect(vote).toHaveProperty("transactionHash");
  });

  it("should return null for non-existent proposal", () => {
    const result = getProposalVotes(repo, { proposalId: 999, limit: 50, offset: 0 });
    expect(result).toBeNull();
  });

  it("should accept hex proposal ID", () => {
    const result = getProposalVotes(repo, { proposalId: mockProposal.proposalId, limit: 50, offset: 0 });
    expect(result).not.toBeNull();
    expect(result?.votes).toHaveLength(4);
  });
});
