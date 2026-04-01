import { NextRequest, NextResponse } from "next/server";
import { fetchPoidhBounty } from "@/services/poidh";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chainId: string; id: string }> },
) {
  const { chainId: chainIdStr, id: idStr } = await params;
  const chainId = parseInt(chainIdStr, 10);
  const id = parseInt(idStr, 10);

  if (isNaN(chainId) || isNaN(id) || id < 1) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    const bounty = await fetchPoidhBounty(chainId, id);

    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    return NextResponse.json({ bounty });
  } catch (error) {
    console.error("POIDH bounty API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bounty" },
      { status: 500 },
    );
  }
}
