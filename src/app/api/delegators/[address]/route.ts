// src/app/api/delegators/[address]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchDelegatorsWithCounts } from "@/services/members";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  // Validate address is a valid Ethereum address (40 hex chars, optional 0x prefix)
  if (!/^(0x)?[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address format" }, { status: 400 });
  }

  try {
    const delegators = await fetchDelegatorsWithCounts(address);
    return NextResponse.json(delegators);
  } catch (error) {
    console.error("Failed to fetch delegators:", error);
    return NextResponse.json({ error: "Failed to fetch delegators" }, { status: 500 });
  }
}
