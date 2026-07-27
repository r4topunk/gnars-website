import { NextResponse } from "next/server";
import { getEthUsd } from "@/services/prices";

/**
 * Thin wrapper over `services/prices`. Provider choice, TTL and failure
 * semantics all live there — this route exists only so client components can
 * reach the price without the Alchemy key.
 *
 * `usd` is `null` when the price is unknown, deliberately NOT `0`: this route
 * used to answer `{ usd: 0 }` on every failure path and `services/treasury.ts`
 * multiplied the treasury's ETH balance by it, rendering a confident $0.
 * Clients that do `?? 0` keep working — `formatEthToUsd` already renders "—"
 * for a falsy price.
 */
export const dynamic = "force-dynamic";

const CDN_TTL_SECONDS = 300;

export async function GET() {
  const usd = await getEthUsd();
  return NextResponse.json(
    { usd },
    {
      headers: usd
        ? {
            "Cache-Control": `public, s-maxage=${CDN_TTL_SECONDS}, stale-while-revalidate=${CDN_TTL_SECONDS * 2}`,
          }
        : // Never pin an outage to the CDN for the full window.
          { "Cache-Control": "no-store" },
    },
  );
}
