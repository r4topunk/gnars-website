import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchProposals, fetchProposalByNumber, fetchVotes } from "../../src/subgraph/client.js";
import { mockProposalsResponse, mockVotesResponse, mockProposal } from "../fixtures/proposals.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("SubgraphClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchProposals", () => {
    it("should fetch proposals successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProposalsResponse,
      });

      const proposals = await fetchProposals(10, 0);

      expect(proposals).toHaveLength(3);
      expect(proposals[0].proposalNumber).toBe(42);
      expect(proposals[0].title).toBe("Sponsor Skater X for Olympics");
    });

    it("should handle pagination parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProposalsResponse,
      });

      await fetchProposals(5, 10);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.variables.first).toBe(5);
      expect(callBody.variables.skip).toBe(10);
    });

    it("should throw SubgraphError on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(fetchProposals()).rejects.toThrow(/500/);
    });

    it("should throw SubgraphError on GraphQL error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: null,
          errors: [{ message: "Invalid query" }],
        }),
      });

      await expect(fetchProposals()).rejects.toThrow(/Invalid query/);
    });
  });

  describe("fetchProposalByNumber", () => {
    it("should fetch a single proposal by number", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { proposals: [mockProposal] },
        }),
      });

      const proposal = await fetchProposalByNumber(42);

      expect(proposal).not.toBeNull();
      expect(proposal?.proposalNumber).toBe(42);
    });

    it("should return null when proposal not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { proposals: [] },
        }),
      });

      const proposal = await fetchProposalByNumber(999);

      expect(proposal).toBeNull();
    });
  });

  describe("fetchVotes", () => {
    it("should fetch votes for a proposal", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVotesResponse,
      });

      const votes = await fetchVotes(42);

      expect(votes).toHaveLength(4);
      expect(votes[0].voter).toBe("0x1111111111111111111111111111111111111111");
      expect(votes[0].support).toBe(1); // FOR
      expect(votes[0].reason).toBe("Great proposal! Love supporting our athletes.");
    });

    it("should include votes with different support values", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockVotesResponse,
      });

      const votes = await fetchVotes(42);

      const forVotes = votes.filter((v) => v.support === 1);
      const againstVotes = votes.filter((v) => v.support === 0);
      const abstainVotes = votes.filter((v) => v.support === 2);

      expect(forVotes).toHaveLength(2);
      expect(againstVotes).toHaveLength(1);
      expect(abstainVotes).toHaveLength(1);
    });
  });
});
