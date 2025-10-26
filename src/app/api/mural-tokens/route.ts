import { NextResponse } from "next/server";
import { fetchAllNFTTokens } from "@/services/auctions";

export async function GET() {
  try {
    const tokens = await fetchAllNFTTokens();
    return NextResponse.json({
      count: tokens.length,
      sample: tokens.slice(0, 10),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

