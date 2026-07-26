import { NextResponse } from "next/server";
import { getStakeGraph, lastMorNote } from "@/services/stake-graph";

// Recompute at most once a minute; serve stale for 5 more while revalidating.
export const revalidate = 60;

export async function GET() {
  try {
    const graph = await getStakeGraph();
    return NextResponse.json({ ...graph, _morNote: lastMorNote() }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "stake_graph_failed" }, { status: 500 });
  }
}
