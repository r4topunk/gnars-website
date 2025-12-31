import { NextRequest, NextResponse } from "next/server";
import {
  fetchGnarsPairedCoins,
  getGnarsPairedCoinByAddress,
  getSubgraphStatus,
} from "@/lib/zora-coins-subgraph";

export const runtime = "edge";

/**
 * GET /api/coins/gnars-paired
 *
 * Fetch coins paired with GNARS Creator Coin.
 *
 * Query params:
 * - address: (optional) get a specific coin by address
 * - limit: number of results (default 50, max 100)
 * - offset: pagination offset (default 0)
 * - status: if "true", returns subgraph sync status
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const address = searchParams.get("address");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    // Return subgraph status
    if (status === "true") {
      const syncStatus = await getSubgraphStatus();
      return NextResponse.json(syncStatus);
    }

    // Get specific coin by address
    if (address) {
      const coin = await getGnarsPairedCoinByAddress(address);
      if (!coin) {
        return NextResponse.json(
          { error: "Coin not found or not GNARS-paired" },
          { status: 404 }
        );
      }
      return NextResponse.json({ coin });
    }

    // Get list of paired coins
    const coins = await fetchGnarsPairedCoins({
      first: limit,
      skip: offset,
    });

    return NextResponse.json({
      coins,
      pagination: {
        limit,
        offset,
        count: coins.length,
        hasMore: coins.length === limit,
      },
    });
  } catch (error) {
    console.error("[API] Error fetching gnars paired coins:", error);

    // Check if subgraph is not configured
    if (
      error instanceof Error &&
      error.message.includes("NEXT_PUBLIC_ZORA_COINS_SUBGRAPH_URL")
    ) {
      return NextResponse.json(
        {
          error: "Subgraph not configured",
          message:
            "Deploy the Zora Coins subgraph and set NEXT_PUBLIC_ZORA_COINS_SUBGRAPH_URL",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch coins" },
      { status: 500 }
    );
  }
}
