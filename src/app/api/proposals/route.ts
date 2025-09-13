import { NextRequest, NextResponse } from "next/server";
import { listProposals } from "@/services/proposals";

export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit") as string, 10)
      : 200;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page") as string, 10) : 0;

    const proposals = await listProposals(limit, page);

    return NextResponse.json(proposals);
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}
