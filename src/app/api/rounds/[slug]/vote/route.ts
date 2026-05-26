import { NextResponse } from "next/server";
import { verifyRoundActionSignature } from "@/features/rounds/signature";
import type { RoundVoteAllocationInput } from "@/features/rounds/types";
import { castRoundVotes } from "@/services/rounds";

type VoteBody = {
  walletAddress?: string;
  issuedAt?: string;
  signature?: `0x${string}`;
  votes?: RoundVoteAllocationInput[];
};

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await request.json()) as VoteBody;
  const path = `/api/rounds/${slug}/vote`;
  const payload = {
    walletAddress: body.walletAddress,
    votes: body.votes,
  };

  try {
    if (!body.walletAddress || !body.issuedAt || !body.signature) {
      return NextResponse.json({ error: "Signed wallet request is required." }, { status: 401 });
    }

    const verified = await verifyRoundActionSignature({
      action: "vote",
      method: "POST",
      path,
      walletAddress: body.walletAddress,
      payload,
      issuedAt: body.issuedAt,
      signature: body.signature,
    });

    if (!verified) {
      return NextResponse.json({ error: "Invalid wallet signature." }, { status: 401 });
    }

    const result = await castRoundVotes({
      slug,
      walletAddress: body.walletAddress,
      votes: body.votes || [],
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit votes.";
    console.error("[rounds] vote failed", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
