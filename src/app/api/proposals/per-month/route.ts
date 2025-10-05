import { NextRequest, NextResponse } from "next/server";
import { SubgraphSDK } from "@buildeross/sdk";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";

export const revalidate = 300; // 5 minutes

// In-memory cache to reduce subgraph queries
let cache: { proposals: number[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const months = parseInt(request.nextUrl.searchParams.get("months") || "12", 10);

    // Check cache
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({
        data: groupByMonth(cache.proposals, months),
        totalProposals: cache.proposals.length,
      });
    }

    // Fetch from subgraph (no RPC calls)
    const result = await SubgraphSDK.connect(CHAIN.id).proposals({
      where: { dao: GNARS_ADDRESSES.token.toLowerCase() },
      first: 500,
      skip: 0,
    });

    const proposals = (result.proposals || []).map((p) => Number(p.timeCreated ?? 0));

    // Update cache
    cache = { proposals, timestamp: now };

    return NextResponse.json({
      data: groupByMonth(proposals, months),
      totalProposals: proposals.length,
    });
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json({ error: "Failed to fetch proposals", data: [] }, { status: 500 });
  }
}

function groupByMonth(timestamps: number[], months: number) {
  const now = new Date();
  const result = [];

  // Generate last N months and count proposals
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const count = timestamps.filter((ts) => {
      const proposalDate = new Date(ts * 1000);
      const proposalKey = `${proposalDate.getFullYear()}-${String(proposalDate.getMonth() + 1).padStart(2, "0")}`;
      return proposalKey === monthKey;
    }).length;

    result.push({
      month: date.toLocaleString("en-US", { month: "short" }),
      count,
    });
  }

  return result;
}

