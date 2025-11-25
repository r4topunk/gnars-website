import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { ProposalRepository } from "../../src/db/repository.js";
import { SCHEMA } from "../../src/db/schema.js";
import { getProposal } from "../../src/tools/get-proposal.js";
import { mockProposal, mockProposalExecuted } from "../fixtures/proposals.js";

describe("getProposal", () => {
  let db: Database.Database;
  let repo: ProposalRepository;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
    repo = new ProposalRepository(db);

    // Seed test data
    repo.upsertProposals([mockProposal, mockProposalExecuted]);
  });

  afterEach(() => {
    db.close();
  });

  it("should get proposal by number", () => {
    const result = getProposal(repo, { id: 42 });

    expect(result).not.toBeNull();
    expect(result?.proposalNumber).toBe(42);
    expect(result?.title).toBe("Sponsor Skater X for Olympics");
  });

  it("should get proposal by hex ID", () => {
    const result = getProposal(repo, { id: mockProposal.proposalId });

    expect(result).not.toBeNull();
    expect(result?.proposalNumber).toBe(42);
  });

  it("should get proposal by string number", () => {
    const result = getProposal(repo, { id: "42" });

    expect(result).not.toBeNull();
    expect(result?.proposalNumber).toBe(42);
  });

  it("should return null for non-existent proposal", () => {
    const byNumber = getProposal(repo, { id: 999 });
    const byId = getProposal(repo, { id: "0xnonexistent" });

    expect(byNumber).toBeNull();
    expect(byId).toBeNull();
  });

  it("should include all detailed fields", () => {
    const result = getProposal(repo, { id: 42 });

    expect(result).toHaveProperty("proposalId");
    expect(result).toHaveProperty("proposalNumber");
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("proposer");
    expect(result).toHaveProperty("forVotes");
    expect(result).toHaveProperty("againstVotes");
    expect(result).toHaveProperty("abstainVotes");
    expect(result).toHaveProperty("quorumVotes");
    expect(result).toHaveProperty("executed");
    expect(result).toHaveProperty("totalVotes");
    expect(result).toHaveProperty("participationRate");
    expect(result).toHaveProperty("result");
  });

  it("should compute totalVotes correctly", () => {
    const result = getProposal(repo, { id: 42 });

    // mockProposal has forVotes: 10, againstVotes: 5, abstainVotes: 2
    expect(result?.totalVotes).toBe(17);
  });

  it("should compute result correctly", () => {
    const passing = getProposal(repo, { id: 42 });
    expect(passing?.result).toBe("PASSING"); // 10 for > 5 against

    const executed = getProposal(repo, { id: 38 });
    expect(executed?.result).toBe("PASSING"); // 50 for > 10 against
  });

  it("should compute participation rate", () => {
    const result = getProposal(repo, { id: 42 });

    // 17 votes / 8 quorum = 212.5%
    expect(result?.participationRate).toBe("212.5% of quorum");
  });
});
