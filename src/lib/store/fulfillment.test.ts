import { describe, expect, it } from "vitest";
import storeCatalog from "@/data/store.json";
import type { Product } from "@/types/store";
import { isDropshipFulfillable } from "./fulfillment";

describe("isDropshipFulfillable", () => {
  it("accepts the hardware wallet SKU", () => {
    expect(isDropshipFulfillable("KK-HW-001")).toBe(true);
  });

  it("rejects the tee SKUs — they carry a keepkey provider but aren't in the dropship catalog", () => {
    expect(isDropshipFulfillable("KK-TEE-LASER")).toBe(false);
    expect(isDropshipFulfillable("KK-TEE-ETHDEN")).toBe(false);
  });

  it("rejects the sandbox SKU (never checkout-eligible; the server substitutes it)", () => {
    expect(isDropshipFulfillable("KK-TEST-001")).toBe(false);
  });

  it("rejects missing/empty SKUs", () => {
    expect(isDropshipFulfillable(undefined)).toBe(false);
    expect(isDropshipFulfillable(null)).toBe(false);
    expect(isDropshipFulfillable("")).toBe(false);
  });

  it("marks exactly one product in the live catalog as checkout-eligible", () => {
    const products = (storeCatalog.products ?? []) as Product[];
    const eligible = products.filter((p) => isDropshipFulfillable(p.fulfillmentSku));
    expect(eligible.map((p) => p.slug)).toEqual(["keepkey-hardware-wallet"]);
  });
});
