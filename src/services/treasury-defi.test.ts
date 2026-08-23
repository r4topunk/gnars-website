import { describe, expect, it } from "vitest";
import { summarizeDefi, type DefiPosition } from "./treasury-defi";

const ok = (usd: number): DefiPosition => ({
  labelKey: "x",
  liquidity: { kind: "instant" },
  ok: true,
  usd,
});
const failed: DefiPosition = { labelKey: "x", liquidity: { kind: "instant" }, ok: false };

describe("summarizeDefi", () => {
  it("sums known positions and reports complete when all reads succeeded", () => {
    const s = summarizeDefi([ok(10), ok(0), ok(2.5)]);
    expect(s.knownUsd).toBeCloseTo(12.5);
    expect(s.complete).toBe(true);
  });

  it("a failed read never counts as zero silently — complete goes false", () => {
    const s = summarizeDefi([ok(10), failed]);
    expect(s.knownUsd).toBe(10);
    expect(s.complete).toBe(false);
  });

  it("legitimate zeros keep complete true — zero is a fact, not a failure", () => {
    const s = summarizeDefi([ok(0), ok(0)]);
    expect(s.knownUsd).toBe(0);
    expect(s.complete).toBe(true);
  });

  it("all-failed yields zero known and incomplete", () => {
    const s = summarizeDefi([failed, failed]);
    expect(s.knownUsd).toBe(0);
    expect(s.complete).toBe(false);
  });
});
