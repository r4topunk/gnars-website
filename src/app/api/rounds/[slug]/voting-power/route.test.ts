import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";
import type { RoundWithSubmissions } from "@/features/rounds/types";

vi.mock("@/services/rounds", () => ({
  getPublicRoundBySlug: vi.fn(),
  getRoundVoteUsage: vi.fn(),
  getRoundVotingPower: vi.fn(),
}));

import { getPublicRoundBySlug, getRoundVoteUsage, getRoundVotingPower } from "@/services/rounds";
import { GET } from "./route";

const walletAddress = "0x39a7b6fa1597bb6657fe84e64e3b836c37d6f75d";

const round: RoundWithSubmissions = {
  id: "round-1",
  slug: "clip-round",
  title: "Clip Round",
  description: "Round description",
  content: "Round content",
  image: "",
  startsAt: "2026-06-01T00:00:00.000Z",
  submissionsOpenAt: "2026-06-02T00:00:00.000Z",
  votingStartsAt: "2026-06-03T00:00:00.000Z",
  votingEndsAt: "2026-06-04T00:00:00.000Z",
  endsAt: "2026-06-04T00:00:00.000Z",
  active: true,
  featured: false,
  status: "published",
  votingStrategy: "fixed_per_wallet",
  votesPerWallet: 5,
  winnerCount: 1,
  maxSubmissionsPerWallet: 1,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  deletedAt: null,
  submissions: [],
  voteActivity: [],
};

describe("GET /api/rounds/[slug]/voting-power", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns votingPower, usedVotes, and remainingVotes", async () => {
    vi.mocked(getPublicRoundBySlug).mockResolvedValueOnce(round);
    vi.mocked(getRoundVotingPower).mockResolvedValueOnce(5);
    vi.mocked(getRoundVoteUsage).mockResolvedValueOnce(2);

    const response = await GET(
      new Request(`https://gnars.com/api/rounds/clip-round/voting-power?wallet=${walletAddress}`),
      { params: Promise.resolve({ slug: "clip-round" }) },
    );

    await expect(response.json()).resolves.toEqual({
      walletAddress: getAddress(walletAddress),
      votingPower: 5,
      usedVotes: 2,
      remainingVotes: 3,
    });
  });
});
