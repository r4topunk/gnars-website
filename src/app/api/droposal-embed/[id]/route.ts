import { NextResponse } from "next/server";
import { formatEther } from "viem";
import { GNARS_ADDRESSES } from "@/lib/config";
import { decodeDroposalParams, isDroposal } from "@/lib/droposal-utils";
import { ipfsToHttp } from "@/lib/ipfs";
import { subgraphQuery } from "@/lib/subgraph";

const PROPOSALS_BY_NUMBER_GQL = /* GraphQL */ `
  query ProposalByNumber($dao: ID!, $proposalNumber: Int!) {
    proposals(where: { dao: $dao, proposalNumber: $proposalNumber }, first: 1) {
      proposalId
      proposalNumber
      title
      calldatas
      targets
    }
  }
`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const num = Number.parseInt(id, 10);
  if (Number.isNaN(num)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const result = await subgraphQuery<{
      proposals: Array<{
        proposalId: string;
        proposalNumber: number;
        title?: string | null;
        calldatas?: string | null;
        targets: string[];
      }>;
    }>(PROPOSALS_BY_NUMBER_GQL, {
      dao: GNARS_ADDRESSES.token.toLowerCase(),
      proposalNumber: num,
    });

    const proposal = result.proposals?.[0];
    if (!proposal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const calldatasRaw = proposal.calldatas;
    const calldatas = Array.isArray(calldatasRaw)
      ? (calldatasRaw as unknown as string[])
      : typeof calldatasRaw === "string"
        ? calldatasRaw.split(":")
        : [];

    let decoded: ReturnType<typeof decodeDroposalParams> | null = null;
    for (let i = 0; i < proposal.targets.length; i++) {
      if (isDroposal(proposal.targets[i], calldatas[i])) {
        decoded = calldatas[i] ? decodeDroposalParams(calldatas[i]!) : null;
        break;
      }
    }

    const mediaImage = decoded?.imageURI ? ipfsToHttp(decoded.imageURI) : undefined;
    const mediaAnimation = decoded?.animationURI ? ipfsToHttp(decoded.animationURI) : undefined;
    const priceEth = decoded?.saleConfig?.publicSalePrice
      ? formatEther(decoded.saleConfig.publicSalePrice)
      : "0";
    const editionSize = decoded?.editionSize ? decoded.editionSize.toString() : "Open";

    return NextResponse.json({
      id: num,
      title: decoded?.name || proposal.title || `Droposal #${num}`,
      mediaAnimation,
      mediaImage,
      priceEth,
      editionSize,
    });
  } catch (e) {
    console.error("Droposal embed API error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
