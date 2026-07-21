import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
  isShippingSupported,
  normalizeCountry,
  SHIPPING_COUNTRY_OPTIONS,
} from "./countries";

describe("normalizeCountry", () => {
  it("passes through a valid ISO-2 code (any case)", () => {
    expect(normalizeCountry("US")).toBe("US");
    expect(normalizeCountry("br")).toBe("BR");
  });

  it("maps common full names / aliases to codes (the autofill trap)", () => {
    expect(normalizeCountry("United States")).toBe("US");
    expect(normalizeCountry("united states of america")).toBe("US");
    expect(normalizeCountry("USA")).toBe("US");
    expect(normalizeCountry("Brasil")).toBe("BR");
    expect(normalizeCountry("United Kingdom")).toBe("GB");
    expect(normalizeCountry("UK")).toBe("GB");
  });

  it("returns empty for unresolvable input", () => {
    expect(normalizeCountry("")).toBe("");
    expect(normalizeCountry("Nowhere Land")).toBe("");
  });
});

describe("COUNTRIES", () => {
  it("uses unique ISO-2 codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of codes) expect(c).toMatch(/^[A-Z]{2}$/);
  });
});

describe("shipping restriction (US-only for now)", () => {
  it("accepts US, rejects everything else", () => {
    expect(isShippingSupported("US")).toBe(true);
    expect(isShippingSupported("us")).toBe(true);
    expect(isShippingSupported(" US ")).toBe(true);
    expect(isShippingSupported("BR")).toBe(false);
    expect(isShippingSupported("GB")).toBe(false);
    expect(isShippingSupported("")).toBe(false);
  });

  it("dropdown options are limited to shippable countries (US only)", () => {
    expect(SHIPPING_COUNTRY_OPTIONS.map((c) => c.code)).toEqual(["US"]);
  });
});
