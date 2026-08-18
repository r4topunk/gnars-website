import { describe, expect, it } from "vitest";
import { formatFiatUsd, localizeFiat } from "./fiat";

const RATE = 5.5;

describe("localizeFiat", () => {
  it("keeps USD untouched on the en locale, even with a rate available", () => {
    expect(localizeFiat(100, "en", RATE)).toEqual({ value: 100, currency: "USD" });
  });

  it("converts to BRL on pt-br when a rate is available", () => {
    expect(localizeFiat(100, "pt-br", RATE)).toEqual({ value: 550, currency: "BRL" });
  });

  it("falls back to USD on pt-br when the rate is unavailable", () => {
    expect(localizeFiat(100, "pt-br", null)).toEqual({ value: 100, currency: "USD" });
  });

  it("applies the same rate to stablecoin-derived values — 1 USDC is not R$ 1", () => {
    // A USDC position's usdValue is already a USD figure; it converts like
    // everything else. Treating it as "already fiat" would understate BRL 5x.
    const usdcPositionUsd = 13436.14;
    expect(localizeFiat(usdcPositionUsd, "pt-br", RATE)).toEqual({
      value: usdcPositionUsd * RATE,
      currency: "BRL",
    });
  });
});

describe("formatFiatUsd", () => {
  const normalize = (s: string) => s.replace(/ /g, " ");

  it("formats BRL in pt-BR conventions on pt-br with a rate", () => {
    expect(normalize(formatFiatUsd(13436.14, "pt-br", RATE))).toBe("R$ 73.898,77");
  });

  it("formats USD on en", () => {
    expect(formatFiatUsd(13436.14, "en", RATE)).toBe("$13,436.14");
  });

  it("formats USD (pt-BR conventions) on pt-br without a rate", () => {
    expect(normalize(formatFiatUsd(13436.14, "pt-br", null))).toBe("US$ 13.436,14");
  });

  it("honors fraction-digit overrides", () => {
    expect(formatFiatUsd(0.0024, "en", null, { maximumFractionDigits: 4 })).toBe("$0.0024");
  });
});
