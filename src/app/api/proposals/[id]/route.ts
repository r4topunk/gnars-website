import { NextRequest, NextResponse } from "next/server";
import { Proposal } from "@/components/proposals/types";
import { getProposalByIdOrNumber } from "@/services/proposals";

export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: proposalId } = await params;
  const requestId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
  const startedAt = Date.now();
  console.log("[api:/api/proposals/:id] request", {
    requestId,
    proposalId,
    method: request.method,
    url: request.url,
  });

  try {
    const proposal: Proposal | null = await getProposalByIdOrNumber(proposalId);
    if (!proposal) {
      console.warn("[api:/api/proposals/:id] not found", {
        requestId,
        proposalId,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    console.log("[api:/api/proposals/:id] success", {
      requestId,
      proposalId,
      durationMs: Date.now() - startedAt,
      proposalNumber: proposal.proposalNumber,
      mappedProposalId: proposal.proposalId,
    });
    return NextResponse.json(proposal);
  } catch (error) {
    console.error("[api:/api/proposals/:id] error", {
      requestId,
      proposalId,
      durationMs: Date.now() - startedAt,
      error,
    });
    return NextResponse.json({ error: "Failed to fetch proposal" }, { status: 500 });
  }
}
