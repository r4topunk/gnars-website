import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Round } from "@/features/rounds/types";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/rpc", () => ({
  serverPublicClient: {
    readContract: vi.fn(),
  },
}));

import { serverPublicClient } from "@/lib/rpc";
import { getRoundVotingPower } from "./rounds";

const readContract = vi.mocked(serverPublicClient.readContract);

const walletAddress = "0x39a7b6fa1597bb6657fe84e64e3b836c37d6f75d";

const baseRound = (strategy: Round["votingStrategy"], votesPerWallet = 3): Round => ({
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
  votingStrategy: strategy,
  votesPerWallet,
  winnerCount: 1,
  maxSubmissionsPerWallet: 1,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  deletedAt: null,
});

describe("getRoundVotingPower", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["fixed_per_wallet", "one_per_wallet", "one_per_nft"] as const)(
    "returns 0 for %s when delegated Gnars votes are 0",
    async (strategy) => {
      readContract.mockResolvedValueOnce(0n);

      await expect(getRoundVotingPower(baseRound(strategy), walletAddress)).resolves.toBe(0);
    },
  );

  it("returns 1 for one_per_wallet when delegated Gnars voting power is greater than 0", async () => {
    readContract.mockResolvedValueOnce(7n);

    await expect(getRoundVotingPower(baseRound("one_per_wallet"), walletAddress)).resolves.toBe(1);
  });

  it("returns votesPerWallet for fixed_per_wallet when delegated Gnars voting power is greater than 0", async () => {
    readContract.mockResolvedValueOnce(7n);

    await expect(getRoundVotingPower(baseRound("fixed_per_wallet", 5), walletAddress)).resolves.toBe(
      5,
    );
  });

  it("returns delegated Gnars voting power for one_per_nft", async () => {
    readContract.mockResolvedValueOnce(7n);

    await expect(getRoundVotingPower(baseRound("one_per_nft"), walletAddress)).resolves.toBe(7);
  });
});
