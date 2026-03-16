// src/app/api/delegators/[address]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchDelegatorsWithCounts } from "@/services/members";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  try {
    const delegators = await fetchDelegatorsWithCounts(address);
    return NextResponse.json(delegators);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to fetch delegators:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
