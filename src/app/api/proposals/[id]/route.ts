import { getProposalByIdOrNumber } from "@/services/proposals";
import { NextRequest, NextResponse } from "next/server";
import { Proposal } from "@/components/proposals/types";

export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params;

  try {
    const proposal: Proposal | null = await getProposalByIdOrNumber(proposalId);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error("Failed to fetch proposal:", error);
    return NextResponse.json({ error: "Failed to fetch proposal" }, { status: 500 });
  }
}
