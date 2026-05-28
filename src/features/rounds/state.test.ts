import { describe, expect, it } from "vitest";
import { getRoundState } from "./state";
import type { Round } from "./types";

const baseRound: Pick<
  Round,
  "active" | "status" | "startsAt" | "submissionsOpenAt" | "votingStartsAt" | "votingEndsAt"
> = {
  active: true,
  status: "published",
  startsAt: "2026-06-01T00:00:00.000Z",
  submissionsOpenAt: "2026-06-02T00:00:00.000Z",
  votingStartsAt: "2026-06-05T00:00:00.000Z",
  votingEndsAt: "2026-06-08T00:00:00.000Z",
};

describe("getRoundState", () => {
  it("returns upcoming before submissions open", () => {
    expect(getRoundState(baseRound, new Date("2026-06-01T12:00:00.000Z"))).toBe("upcoming");
  });

  it("returns submissions_open during the submission window", () => {
    expect(getRoundState(baseRound, new Date("2026-06-03T00:00:00.000Z"))).toBe("submissions_open");
  });

  it("returns voting_open during the voting window", () => {
    expect(getRoundState(baseRound, new Date("2026-06-06T00:00:00.000Z"))).toBe("voting_open");
  });

  it("returns ended after voting closes", () => {
    expect(getRoundState(baseRound, new Date("2026-06-09T00:00:00.000Z"))).toBe("ended");
  });

  it("returns draft when the round is inactive or unpublished", () => {
    expect(
      getRoundState({ ...baseRound, active: false }, new Date("2026-06-06T00:00:00.000Z")),
    ).toBe("draft");
  });
});
