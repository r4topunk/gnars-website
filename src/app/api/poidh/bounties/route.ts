import { NextRequest, NextResponse } from "next/server";
import { fetchPoidhBounties } from "@/services/poidh";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") || "open") as "open" | "closed" | "voting" | "all";
  let limit = parseInt(searchParams.get("limit") || "100", 10);
  if (isNaN(limit) || limit < 1) limit = 100;
  if (limit > 500) limit = 500;
  const filterGnarly = searchParams.get("filterGnarly") !== "false";

  try {
    const data = await fetchPoidhBounties({ status, limit, filterGnarly });
    return NextResponse.json(data);
  } catch (error) {
    console.error("POIDH API error:", error);
    return NextResponse.json({ error: "Failed to fetch bounties" }, { status: 500 });
  }
}
