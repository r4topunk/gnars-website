import { describe, expect, it } from "vitest";
import type { RoundRequestInput } from "./types";
import { resolveRoundSlug, validateRoundRequest } from "./validation";

const validRequest = (): RoundRequestInput => ({
  walletAddress: "0x39a7b6fa1597bb6657fe84e64e3b836c37d6f75d",
  requesterName: "Gnars Builder",
  requesterEmail: "builder@example.com",
  requestedSlug: "clip-round",
  title: "Clip Round",
  description: "A community round for strong clips and spot submissions.",
  content: "Submit a clip, spot, or builder artifact with enough detail for community review.",
  image: "data:image/png;base64,abc123",
  url: "https://example.com",
  timeline: "One week for submissions and one week for voting.",
  submissionsOpenAt: "2026-06-01T12:00:00.000Z",
  votingStartsAt: "2026-06-08T12:00:00.000Z",
  votingEndsAt: "2026-06-15T12:00:00.000Z",
  votingStrategy: "fixed_per_wallet",
  votesPerWallet: 3,
  winnerCount: 1,
  maxSubmissionsPerWallet: 1,
  awards: [{ position: 1, title: "Winner", value: "0.25 ETH" }],
});

describe("validateRoundRequest", () => {
  it("accepts a valid round request with an uploaded data image", () => {
    expect(validateRoundRequest(validRequest())).toBeUndefined();
  });

  it("rejects invalid timeline ordering", () => {
    const request = validRequest();
    request.votingStartsAt = "2026-05-31T12:00:00.000Z";

    expect(validateRoundRequest(request)).toBe("Voting must start after submissions open.");
  });

  it("requires award inputs to match winner count", () => {
    const request = validRequest();
    request.winnerCount = 2;

    expect(validateRoundRequest(request)).toBe("Add 2 awards.");
  });
});

describe("resolveRoundSlug", () => {
  it("returns the normalized base when free", () => {
    expect(resolveRoundSlug("Clip Round", [])).toBe("clip-round");
  });

  it("appends the next free suffix on collision", () => {
    expect(resolveRoundSlug("clip-round", ["clip-round"])).toBe("clip-round-2");
    expect(resolveRoundSlug("clip-round", ["clip-round", "clip-round-2"])).toBe("clip-round-3");
  });

  it("keeps the base when only suffixed slugs are taken", () => {
    expect(resolveRoundSlug("clip-round", ["clip-round-2"])).toBe("clip-round");
  });

  it("falls back to 'round' for input with no usable characters", () => {
    expect(resolveRoundSlug("!!!", [])).toBe("round");
  });
});
