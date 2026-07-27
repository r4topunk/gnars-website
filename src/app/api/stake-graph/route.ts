import { NextResponse } from "next/server";
import { getStakeGraph, GRAPH_TTL_SECONDS } from "@/services/stake-graph";

/**
 * Dynamic + explicit `Cache-Control` (caching-standard.md Rule 1): the CDN
 * absorbs the read traffic per region and this bills ZERO ISR write units,
 * while `getStakeGraph`'s `unstable_cache` (tag `stake`, 1800s backstop) is the
 * cross-region cache that keeps a cold region from recomputing the graph.
 *
 * Freshness after a deposit comes from `revalidateTag("stake")`, fired by the
 * stake hooks via `/api/revalidate` — not from a short TTL.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const graph = await getStakeGraph();
    return NextResponse.json(graph, {
      headers: {
        "Cache-Control": `public, s-maxage=${GRAPH_TTL_SECONDS}, stale-while-revalidate=${GRAPH_TTL_SECONDS * 2}`,
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
