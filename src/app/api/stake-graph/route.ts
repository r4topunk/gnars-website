import { NextResponse } from "next/server";
import { loadStakeGraph } from "@/services/stake-graph";

/**
 * Two independent cache windows, and they must NOT share a constant:
 *
 * 1. The CDN entry, created by the `Cache-Control` header below. This one is
 *    **not tag-aware** — `revalidateTag("stake")` reaches Next's data cache and
 *    nothing else, so a region holding a warm header-cached response keeps
 *    serving the old graph until it expires on its own. That makes this value
 *    the real upper bound on how stale another user's orbit can be, which is
 *    why it is short (300s) and deliberately decoupled from the backstop.
 * 2. `getStakeGraph`'s `unstable_cache` (tag `stake`, 1800s backstop in the
 *    service). This is what protects the expensive part: a CDN miss costs a
 *    millisecond-scale data-cache read of a ~2KB payload, not the ~3.5s
 *    recompute. So a short CDN TTL is cheap here in a way it was NOT before
 *    the service was cached.
 *
 * Worst case staleness is s-maxage + the stale-while-revalidate window on a
 * region with sparse traffic (the first request after expiry is served stale
 * while revalidation runs in the background), not s-maxage alone.
 *
 * `force-dynamic` keeps this out of the ISR/full-route cache, so it bills zero
 * ISR write units (caching-standard.md Rule 1).
 */
export const dynamic = "force-dynamic";

/** Cross-user staleness bound. See the note above on why this is not the
 * service's backstop TTL. */
const CDN_TTL_SECONDS = 300;

export async function GET() {
  try {
    const { graph, degraded } = await loadStakeGraph();
    return NextResponse.json(graph, {
      headers: {
        // A degraded graph must not enter EITHER cache. The service keeps it out
        // of the data cache by throwing; `no-store` is what keeps it out of the
        // CDN — the cache `revalidateTag` cannot reach, and therefore the one
        // that would pin an empty orbit for the full s-maxage window even after
        // the indexer recovered.
        "Cache-Control": degraded
          ? "no-store"
          : `public, s-maxage=${CDN_TTL_SECONDS}, stale-while-revalidate=${CDN_TTL_SECONDS * 2}`,
      },
    });
  } catch {
    // Never let a failed graph get cached as if it were real data.
    return NextResponse.json(
      { error: "stake_graph_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
