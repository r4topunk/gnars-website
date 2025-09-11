import { getProposal, getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { NextRequest, NextResponse } from "next/server";
import { Proposal, ProposalVote } from "@/components/proposals/types";
import { getProposalStatus } from "@/lib/schemas/proposals";

export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: proposalId } = await params;

  try {
    const isHexId = proposalId.startsWith("0x");
    let sdkProposal: SdkProposal | undefined;

    if (isHexId) {
      sdkProposal = await getProposal(CHAIN.id as unknown as number, proposalId);
    } else {
      const targetNumber = Number.parseInt(proposalId, 10);
      if (Number.isNaN(targetNumber)) {
        sdkProposal = undefined;
      } else {
        const LIMIT = 200;
        const MAX_PAGES = 5;
        for (let page = 0; page < MAX_PAGES; page += 1) {
          const { proposals } = await getProposals(
            CHAIN.id as unknown as number,
            GNARS_ADDRESSES.token,
            LIMIT,
            page
          );
          const match = (proposals ?? []).find(
            (p) => Number(p.proposalNumber ?? -1) === targetNumber
          );
          if (match) {
            sdkProposal = match;
            break;
          }
          if (!proposals || proposals.length < LIMIT) {
            break;
          }
        }
      }
    }

    if (!sdkProposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const endDate = (() => {
      const voteEnd = Number(sdkProposal.voteEnd ?? 0);
      if (voteEnd > 0) return new Date(voteEnd * 1000);
      const record = sdkProposal as unknown as Record<string, unknown>;
      const expiresAtRaw = record["expiresAt"];
      const expiresAtNumber =
        typeof expiresAtRaw === "number"
          ? expiresAtRaw
          : typeof expiresAtRaw === "string"
            ? Number.parseInt(expiresAtRaw, 10)
            : 0;
      return expiresAtNumber > 0 ? new Date(expiresAtNumber * 1000) : undefined;
    })();

    const proposal: Proposal = {
      proposalId: String(sdkProposal.proposalId),
      proposalNumber: Number(sdkProposal.proposalNumber),
      title: sdkProposal.title ?? "",
      description: sdkProposal.description ?? "",
      status: getProposalStatus(sdkProposal.state),
      proposer: String(sdkProposal.proposer),
      proposerEnsName: undefined,
      createdAt: Number(sdkProposal.timeCreated ?? 0) * 1000,
      endBlock: Number(sdkProposal.voteEnd ?? 0),
      snapshotBlock: sdkProposal.snapshotBlockNumber
        ? Number(sdkProposal.snapshotBlockNumber)
        : undefined,
      endDate,
      forVotes: Number(sdkProposal.forVotes ?? 0),
      againstVotes: Number(sdkProposal.againstVotes ?? 0),
      abstainVotes: Number(sdkProposal.abstainVotes ?? 0),
      quorumVotes: Number(sdkProposal.quorumVotes ?? 0),
      calldatas: (() => {
        const direct = (sdkProposal as unknown as { calldatas?: unknown }).calldatas;
        if (Array.isArray(direct)) return direct.map(String);
        if (typeof direct === "string") return [direct];
        const record = sdkProposal as unknown as Record<string, unknown>;
        const raw = record["calldatas"];
        if (Array.isArray(raw)) return raw.map(String);
        if (typeof raw === "string") return [raw];
        return [] as string[];
      })(),
      targets: (sdkProposal.targets as unknown[] | undefined)?.map(String) ?? [],
      values: (sdkProposal.values as unknown[] | undefined)?.map(String) ?? [],
      signatures: [],
      transactionHash: String(sdkProposal.transactionHash ?? ""),
      votes: Array.isArray(sdkProposal.votes)
        ? sdkProposal.votes.map(
            (v): ProposalVote => ({
              voter: String(v.voter),
              voterEnsName: undefined,
              choice: ((): ProposalVote["choice"] => {
                const s = String(v.support ?? "").toUpperCase();
                if (s.includes("FOR")) return "FOR";
                if (s.includes("AGAINST")) return "AGAINST";
                return "ABSTAIN";
              })(),
              votes: String(v.weight ?? 0),
              transactionHash: "",
            })
          )
        : [],
      voteStart: new Date(Number(sdkProposal.voteStart ?? 0) * 1000).toISOString(),
      voteEnd: new Date(Number(sdkProposal.voteEnd ?? 0) * 1000).toISOString(),
      expiresAt: sdkProposal.expiresAt
        ? new Date(Number(sdkProposal.expiresAt) * 1000).toISOString()
        : undefined,
      timeCreated: Number(sdkProposal.timeCreated ?? 0),
    };

    return NextResponse.json(proposal);
  } catch (error) {
    console.error("Failed to fetch proposal:", error);
    return NextResponse.json({ error: "Failed to fetch proposal" }, { status: 500 });
  }
}
