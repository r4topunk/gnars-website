import { describe, expect, it } from "vitest";
import { decideRetroSource } from "./treasury-inflows";

// Amounts in USDC base units (6dp).
const usdc = (n: number) => BigInt(Math.round(n * 1e6));

describe("decideRetroSource", () => {
  it("attributes when every credit since the last withdraw came from one product", () => {
    expect(decideRetroSource([{ amount: usdc(7.8434), source: "subnet" }], usdc(7.8434))).toBe(
      "subnet",
    );
  });

  it("attributes across multiple credits of the same product", () => {
    expect(
      decideRetroSource(
        [
          { amount: usdc(5), source: "subnet" },
          { amount: usdc(2.8434), source: "subnet" },
        ],
        usdc(7.8434),
      ),
    ).toBe("subnet");
  });

  it("falls back to generic when the credits mix products", () => {
    expect(
      decideRetroSource(
        [
          { amount: usdc(5), source: "subnet" },
          { amount: usdc(2.8434), source: "swap" },
        ],
        usdc(7.8434),
      ),
    ).toBe("splits");
  });

  it("falls back to generic when the credits do not cover the withdrawal", () => {
    // A credit older than the search window stayed unfound: the found credits
    // cannot explain the whole withdrawal, so no single product may claim it.
    expect(decideRetroSource([{ amount: usdc(3), source: "subnet" }], usdc(7.8434))).toBe("splits");
  });

  it("falls back to generic with no credits found", () => {
    expect(decideRetroSource([], usdc(7.8434))).toBe("splits");
  });

  it("stays generic when the only explaining credits are themselves unattributable", () => {
    expect(decideRetroSource([{ amount: usdc(7.8434), source: "splits" }], usdc(7.8434))).toBe(
      "splits",
    );
  });

  it("tolerates the warehouse's 1-unit gas-optimization leftover", () => {
    // withdraw pulls balance-1; credits sum can sit 1-2 units above or below.
    expect(decideRetroSource([{ amount: usdc(7.8434) - 1n, source: "subnet" }], usdc(7.8434))).toBe(
      "subnet",
    );
  });
});
