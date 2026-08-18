import { cache } from "react";
import { getLocale } from "next-intl/server";
import { unstable_cache } from "next/cache";

/**
 * USD→BRL spot rate for displaying treasury figures in R$ on the pt-br locale.
 *
 * open.er-api.com is keyless and refreshes daily; the 1h server cache keeps us
 * to at most one upstream call per hour across all visitors. A failed or
 * malformed response THROWS inside the cached function — unstable_cache does
 * not cache errors, so the next request retries instead of pinning a miss for
 * an hour. Callers get `null` and must fall back to USD with a visible
 * indicator, never a stale or guessed R$ figure.
 */
const fetchUsdBrlRate = unstable_cache(
  async (): Promise<number> => {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`Exchange rate request failed: ${response.status}`);
    }
    const data = (await response.json()) as { result?: string; rates?: { BRL?: number } };
    const rate = data.rates?.BRL;
    if (
      data.result !== "success" ||
      typeof rate !== "number" ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      throw new Error("Exchange rate response missing a usable BRL rate");
    }
    return rate;
  },
  ["usd-brl-rate"],
  { revalidate: 3600 },
);

export async function getUsdBrlRate(): Promise<number | null> {
  try {
    return await fetchUsdBrlRate();
  } catch {
    return null;
  }
}

/**
 * The rate the current request should convert fiat displays with:
 * a BRL rate on pt-br, `null` (= keep USD) everywhere else.
 * React-cached so every card on the page shares one lookup per request.
 */
export const getBrlRateForRequest = cache(async (): Promise<number | null> => {
  const locale = await getLocale();
  if (locale !== "pt-br") return null;
  return getUsdBrlRate();
});
