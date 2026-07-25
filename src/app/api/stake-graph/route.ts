import { NextResponse } from "next/server";
import { getStakeGraph, lastMorNote } from "@/services/stake-graph";

// Recompute at most once a minute; serve stale for 5 more while revalidating.
export const revalidate = 60;

export async function GET() {
  try {
    const graph = await getStakeGraph();
    // Diagnostic: is the Etherscan key present in this deploy's env? (temporary)
    const _etherscanKey = Boolean(process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY);
    return NextResponse.json({ ...graph, _etherscanKey, _morNote: lastMorNote() }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "stake_graph_failed" }, { status: 500 });
  }
}
