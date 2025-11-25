import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateProposalStatus, type SubgraphProposal } from "../../src/subgraph/types.js";
import { mockProposal } from "../fixtures/proposals.js";

describe("calculateProposalStatus", () => {
  const now = 1700500000; // Fixed timestamp for tests

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now * 1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return VETOED if vetoed", () => {
    const proposal: SubgraphProposal = {
      ...mockProposal,
      vetoed: true,
    };
    expect(calculateProposalStatus(proposal)).toBe("VETOED");
  });

  it("should return CANCELLED if canceled", () => {
    const proposal: SubgraphProposal = {
      ...mockProposal,
      canceled: true,
    };
    expect(calculateProposalStatus(proposal)).toBe("CANCELLED");
  });

  it("should return EXECUTED if executed", () => {
    const proposal: SubgraphProposal = {
      ...mockProposal,
      executed: true,
    };
    expect(calculateProposalStatus(proposal)).toBe("EXECUTED");
  });

  it("should return QUEUED if queued", () => {
    const proposal: SubgraphProposal = {
      ...mockProposal,
      queued: true,
    };
    expect(calculateProposalStatus(proposal)).toBe("QUEUED");
  });

  it("should return PENDING if voting has not started", () => {
    const proposal: SubgraphProposal = {
      ...mockProposal,
      voteStart: (now + 1000).toString(), // Future
      voteEnd: (now + 10000).toString(),
    };
    expect(calculateProposalStatus(proposal)).toBe("PENDING");
  });

  it("should return ACTIVE during voting period", () => {
    const proposal: SubgraphProposal = {
      ...mockProposal,
      voteStart: (now - 1000).toString(), // Past
      voteEnd: (now + 1000).toString(), // Future
    };
    expect(calculateProposalStatus(proposal)).toBe("ACTIVE");
  });

  it("should return DEFEATED if forVotes <= againstVotes after voting", () => {
    const proposal: SubgraphProposal = {
      ...mockProposal,
      voteStart: (now - 10000).toString(),
      voteEnd: (now - 1000).toString(), // Voting ended
      forVotes: "10",
      againstVotes: "15",
      quorumVotes: "5",
    };
    expect(calculateProposalStatus(proposal)).toBe("DEFEATED");
  });

  it("should return DEFEATED if quorum not reached after voting", () => {
    const proposal: SubgraphProposal = {
      ...mockProposal,
      voteStart: (now - 10000).toString(),
      voteEnd: (now - 1000).toString(),
      forVotes: "10",
      againstVotes: "5",
      quorumVotes: "20", // Quorum not met
    };
    expect(calculateProposalStatus(proposal)).toBe("DEFEATED");
  });

  it("should return SUCCEEDED if passed and quorum met", () => {
    const proposal: SubgraphProposal = {
      ...mockProposal,
      voteStart: (now - 10000).toString(),
      voteEnd: (now - 1000).toString(),
      forVotes: "30",
      againstVotes: "5",
      quorumVotes: "20",
    };
    expect(calculateProposalStatus(proposal)).toBe("SUCCEEDED");
  });

  it("should return EXPIRED if past expiration time", () => {
    const proposal: SubgraphProposal = {
      ...mockProposal,
      voteStart: (now - 20000).toString(),
      voteEnd: (now - 10000).toString(),
      forVotes: "30",
      againstVotes: "5",
      quorumVotes: "20",
      expiresAt: (now - 1000).toString(), // Expired
    };
    expect(calculateProposalStatus(proposal)).toBe("EXPIRED");
  });
});
