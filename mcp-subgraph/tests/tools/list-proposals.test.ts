import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { ProposalRepository } from "../../src/db/repository.js";
import { SCHEMA } from "../../src/db/schema.js";
import { listProposals } from "../../src/tools/list-proposals.js";
import { mockProposal, mockProposalExecuted, mockProposalDefeated } from "../fixtures/proposals.js";

describe("listProposals", () => {
  let db: Database.Database;
  let repo: ProposalRepository;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
    repo = new ProposalRepository(db);

    // Seed test data
    repo.upsertProposals([mockProposal, mockProposalExecuted, mockProposalDefeated]);
  });

  afterEach(() => {
    db.close();
  });

  it("should return all proposals with defaults", () => {
    const result = listProposals(repo, { limit: 20, offset: 0, order: "desc" });

    expect(result.proposals).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.hasMore).toBe(false);
  });

  it("should paginate results", () => {
    const page1 = listProposals(repo, { limit: 2, offset: 0, order: "desc" });
    const page2 = listProposals(repo, { limit: 2, offset: 2, order: "desc" });

    expect(page1.proposals).toHaveLength(2);
    expect(page1.hasMore).toBe(true);

    expect(page2.proposals).toHaveLength(1);
    expect(page2.hasMore).toBe(false);
  });

  it("should filter by status", () => {
    const executed = listProposals(repo, { status: "EXECUTED", limit: 20, offset: 0, order: "desc" });

    expect(executed.proposals).toHaveLength(1);
    expect(executed.proposals[0].proposalNumber).toBe(38);
  });

  it("should return proposal summary fields", () => {
    const result = listProposals(repo, { limit: 1, offset: 0, order: "desc" });

    const proposal = result.proposals[0];
    expect(proposal).toHaveProperty("proposalNumber");
    expect(proposal).toHaveProperty("title");
    expect(proposal).toHaveProperty("status");
    expect(proposal).toHaveProperty("proposer");
    expect(proposal).toHaveProperty("forVotes");
    expect(proposal).toHaveProperty("againstVotes");
    expect(proposal).toHaveProperty("abstainVotes");
    expect(proposal).toHaveProperty("quorumVotes");
    expect(proposal).toHaveProperty("voteStart");
    expect(proposal).toHaveProperty("voteEnd");
    expect(proposal).toHaveProperty("timeCreated");
  });

  it("should respect order parameter", () => {
    const asc = listProposals(repo, { limit: 20, offset: 0, order: "asc" });
    const desc = listProposals(repo, { limit: 20, offset: 0, order: "desc" });

    expect(asc.proposals[0].proposalNumber).not.toBe(desc.proposals[0].proposalNumber);
  });
});
