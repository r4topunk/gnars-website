import { getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { NextRequest, NextResponse } from "next/server";
import { Proposal } from "@/components/proposals/types";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { getProposalStatus, proposalSchema } from "@/lib/schemas/proposals";

export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = 'force-dynamic';

function mapProposal(p: SdkProposal): Proposal {
  const status = getProposalStatus(p.state);
  return {
    proposalId: String(p.proposalId),
    proposalNumber: Number(p.proposalNumber),
    title: p.title ?? "",
    description: p.description ?? "",
    proposer: p.proposer,
    status,
    proposerEnsName: undefined,
    createdAt: Number(p.timeCreated ?? 0) * 1000,
    endBlock: Number(p.voteEnd ?? 0),
    snapshotBlock: p.snapshotBlockNumber ? Number(p.snapshotBlockNumber) : undefined,
    endDate: p.voteEnd ? new Date(Number(p.voteEnd) * 1000) : undefined,
    forVotes: Number(p.forVotes ?? 0),
    againstVotes: Number(p.againstVotes ?? 0),
    abstainVotes: Number(p.abstainVotes ?? 0),
    quorumVotes: Number(p.quorumVotes ?? 0),
    calldatas: [],
    targets: [],
    values: [],
    signatures: [],
    transactionHash: p.transactionHash ?? "",
    votes: [],
    voteStart: new Date(Number(p.voteStart ?? 0) * 1000).toISOString(),
    voteEnd: new Date(Number(p.voteEnd ?? 0) * 1000).toISOString(),
    expiresAt: p.expiresAt
      ? new Date(Number(p.expiresAt) * 1000).toISOString()
      : undefined,
    timeCreated: Number(p.timeCreated ?? 0),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit") as string, 10)
      : 200;
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page") as string, 10)
      : 0;

    const { proposals: sdkProposals } = await getProposals(
      CHAIN.id,
      GNARS_ADDRESSES.token,
      limit,
      page
    );

    const proposals = ((sdkProposals as SdkProposal[] | undefined) ?? [])
      .map(mapProposal)
      .map((p) => proposalSchema.parse(p));

    return NextResponse.json(proposals);
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}
