import { describe, expect, it } from "vitest";
import { isRoundAdminAddress } from "./admin";

describe("isRoundAdminAddress", () => {
  it("matches approved round admins case-insensitively", () => {
    expect(isRoundAdminAddress("0x39A7B6FA1597BB6657FE84E64E3B836C37D6F75D")).toBe(true);
  });

  it("rejects missing or unapproved addresses", () => {
    expect(isRoundAdminAddress(undefined)).toBe(false);
    expect(isRoundAdminAddress("0x0000000000000000000000000000000000000000")).toBe(false);
  });
});
