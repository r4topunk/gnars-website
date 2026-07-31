/**
 * The single source of truth for USD prices.
 *
 * Before this module the app had four independent price paths: `/api/eth-price`
 * (Alchemy, 60s), `/api/prices` (CoinGecko, 4h), `services/stake-graph.ts`
 * (CoinGecko, 300s, unauthenticated) and `/api/wallet/tokens` (CoinGecko). Two
 * of them ran inside `services/treasury.ts` at the same time, so the ETH price
 * shown by one component could disagree with another's on the same page.
 *
 * Three rules hold here and nowhere else:
 *
 * 1. **One provider per asset class.** Alchemy for ETH (the key is already
 *    mandatory and it is the fresher feed); CoinGecko for ERC-20s (that is
 *    where its coverage is). Callers do not get to choose.
 * 2. **An unknown price is `null`, never `0`.** A missing price that arrives as
 *    `0` multiplies balances into a confident, well-formed "$0" — the treasury
 *    page did exactly this whenever Alchemy hiccuped. `null` forces every
 *    caller to decide what to render, and TypeScript makes them.
 * 3. **One TTL.** 300s for everything, as a `prices` tagged data cache.
 */
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

/** USD price, or `null` when it could not be determined. Never `0` for unknown. */
export type UsdPrice = number | null;

/** Shared by every price read. Freshness comes from the TTL — prices have no
 * mutation to invalidate on — but the tag lets them be purged deliberately. */
const PRICE_TTL_SECONDS = 300;

/** CoinGecko platform slugs we actually query. */
export type CoinGeckoPlatform = "base" | "arbitrum-one" | "ethereum";

function coingeckoHeaders(apiKey: string): HeadersInit {
  return { "user-agent": "gnars-website/prices", "x-cg-demo-api-key": apiKey };
}

/** Guards against `0`, negatives and NaN all being read as a real price. */
function toPrice(value: unknown): UsdPrice {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchEthUsd(): Promise<UsdPrice> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.g.alchemy.com/prices/v1/tokens/by-symbol?symbols=ETH", {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: PRICE_TTL_SECONDS },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: { symbol: string; prices?: { currency: string; value?: string }[] }[];
    };
    const eth = data?.data?.find((d) => d.symbol === "ETH");
    const usd = eth?.prices?.find((p) => p.currency.toLowerCase() === "usd");
    return toPrice(usd?.value);
  } catch {
    return null;
  }
}

async function fetchTokenPricesUsd(
  addresses: string[],
  platform: CoinGeckoPlatform,
): Promise<Record<string, UsdPrice>> {
  const wanted = [...new Set(addresses.map((a) => a.toLowerCase()).filter(Boolean))];
  // Every requested address gets a key, so a caller can always tell "asked and
  // unknown" from "never asked".
  const out: Record<string, UsdPrice> = Object.fromEntries(wanted.map((a) => [a, null]));
  if (wanted.length === 0) return out;

  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) return out;

  try {
    const params = new URLSearchParams({
      contract_addresses: wanted.join(","),
      vs_currencies: "usd",
    });
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/${platform}?${params}`,
      { headers: coingeckoHeaders(apiKey), next: { revalidate: PRICE_TTL_SECONDS } },
    );
    if (!res.ok) return out;
    const json = (await res.json()) as Record<string, { usd?: number }>;
    for (const [addr, value] of Object.entries(json)) {
      const key = addr.toLowerCase();
      if (key in out) out[key] = toPrice(value?.usd);
    }
    return out;
  } catch {
    return out;
  }
}

/**
 * ETH/USD via Alchemy, or `null`. Callers that multiply a balance by this MUST
 * branch on `null` rather than defaulting to `0` — see rule 2 above.
 */
export const getEthUsd = unstable_cache(fetchEthUsd, ["price-eth-usd"], {
  tags: [CACHE_TAGS.prices],
  revalidate: PRICE_TTL_SECONDS,
});

/**
 * ERC-20 prices via CoinGecko, keyed by lowercased address. Every requested
 * address is present in the result; unknown ones map to `null`.
 */
export const getTokenPricesUsd = unstable_cache(fetchTokenPricesUsd, ["price-tokens-usd"], {
  tags: [CACHE_TAGS.prices],
  revalidate: PRICE_TTL_SECONDS,
});

/** Convenience for the common "one token on one chain" read. */
export async function getTokenPriceUsd(
  address: string,
  platform: CoinGeckoPlatform,
): Promise<UsdPrice> {
  const prices = await getTokenPricesUsd([address], platform);
  return prices[address.toLowerCase()] ?? null;
}
