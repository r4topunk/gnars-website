import { NextRequest, NextResponse } from "next/server";
import { listProposals } from "@/services/proposals";

export const dynamic = "force-dynamic";
// Dynamic (reads search params), so `revalidate` is ignored — the response is
// cached at the Vercel CDN via the Cache-Control header on the success response.

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit") as string, 10)
      : 200;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page") as string, 10) : 0;

    const proposals = await listProposals(limit, page);

    return NextResponse.json(proposals, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}
