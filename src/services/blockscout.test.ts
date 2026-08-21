import { describe, expect, it, vi } from "vitest";
import { blockscoutGet, blockscoutAddressTokens } from "./blockscout";

const TOKENS_PATH = "addresses/0x8Bf5941d27176242745B716251943Ae4892a3C26/tokens?type=ERC-20";

function response500() {
  return new Response('"Internal server error"', { status: 500, statusText: "Internal Server Error" });
}
function response200() {
  const item = { to: { hash: "0xabc" } };
  const payload = {
    items: [item],
  };
  const headers: Record<string, string> = { "content-type": "application/json" };
  return new Response(JSON.stringify(payload), { status: 200, headers });
}

/**
 * Regression: Blockscout Base returned a 500 with a PLAIN-TEXT body
 * (`"Internal server error"`). The helper must treat that as `null`
 * (degrade to an empty list), and must never call `.json()` on a
 * non-OK response — that `.json()` on a non-JSON body is what crashed the UI.
 */
describe("blockscoutGet", () => {
  it("returns null on the 500 + non-JSON body (no crash)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response500()));
    const res = await blockscoutGet<{ items?: unknown[] }>(TOKENS_PATH);
    expect(res).toBeNull();
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response200()));
    const res = await blockscoutGet<{ items?: unknown[] }>(TOKENS_PATH);
    expect(res?.items?.length).toBe(1);
    vi.unstubAllGlobals();
  });
});

describe("blockscoutAddressTokens", () => {
  it("degrades to null on the production 500, and hits the exact failing URL", async () => {
    const fetchMock = vi.fn(async () => response500());
    vi.stubGlobal("fetch", fetchMock);
    const res = await blockscoutAddressTokens("0x8Bf5941d27176242745B716251943Ae4892a3C26");
    expect(res).toBeNull();
    const calls: unknown[] = fetchMock.mock.calls;
    const call0 = calls[0] as unknown[];
    const calledUrl = call0[0] as string;
    expect(calledUrl).toContain("/addresses/0x8Bf5941d27176242745B716251943Ae4892a3C26/tokens?type=ERC-20");
    vi.unstubAllGlobals();
  });
});
