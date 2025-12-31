import { NextRequest, NextResponse } from "next/server";
import {
  getGnarsPairedCoins,
  getGnarsReferredCoins,
  getCoinsByCreator,
} from "@/lib/zora-coins-subgraph";

export const runtime = "edge";

/**
 * GET /api/coins/gnars-paired
 *
 * Fetch coins paired with Gnars Creator Coin or referred by Gnars.
 *
 * Query params:
 * - type: "paired" (default) | "referred" | "creator"
 * - creator: (required if type=creator) creator address
 * - limit: number of results (default 50, max 100)
 * - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const type = searchParams.get("type") || "paired";
  const creator = searchParams.get("creator");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    let coins;

    switch (type) {
      case "referred":
        coins = await getGnarsReferredCoins(limit, offset);
        break;

      case "creator":
        if (!creator) {
          return NextResponse.json(
            { error: "creator address is required for type=creator" },
            { status: 400 }
          );
        }
        coins = await getCoinsByCreator(creator, limit, offset);
        break;

      case "paired":
      default:
        coins = await getGnarsPairedCoins(limit, offset);
        break;
    }

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
