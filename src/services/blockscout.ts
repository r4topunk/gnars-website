/**
 * Shared, crash-safe Blockscout (Base) fetcher — plain fetch + types, no React,
 * so it's importable from client hooks AND server-side `stake-graph`.
 *
 * Why this exists: Blockscout's Base instance intermittently returns a 500 with
 * a PLAIN-TEXT body (`"Internal server error"`). The old call sites called
 * `res.json()` after `!res.ok` guards in some places, but the swap miniapp's
 * `addresses/{addr}/tokens?type=ERC-20` call had no guard and crashed the token
 * picker on the 500. This helper centralises the safe pattern: fetch with a
 * timeout, parse JSON only on 2xx, and return `null` on any failure — so a
 * Blockscout outage degrades to "no data" instead of a UI error state.
 */

const BLOCKSCOUT_BASE = "https://base.blockscout.com/api/v2";
const BLOCKSCOUT_TIMEOUT_MS = 9_000;

/**
 * GET `{BLOCKSCOUT_BASE}/{path}`. Returns the parsed JSON cast to `T` on 2xx,
 * or `null` on any non-2xx (including the 500 "Internal server error"), timeout,
 * or non-JSON body. Never throws — callers treat `null` as "the source failed".
 */
export async function blockscoutGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BLOCKSCOUT_BASE}/${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(BLOCKSCOUT_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = await res.json(); // safe: only reached on 2xx
    return json as T;
  } catch {
    return null;
  }
}

/**
 * The endpoint that 500s in production:
 * `addresses/{addr}/tokens?type=ERC-20`. Returns the parsed list or `null` on
 * the 500 + non-JSON body.
 */
export function blockscoutAddressTokens(address: string): Promise<{ items?: unknown[] } | null> {
  return blockscoutGet<{ items?: unknown[] }>(`addresses/${address}/tokens?type=ERC-20`);
}
