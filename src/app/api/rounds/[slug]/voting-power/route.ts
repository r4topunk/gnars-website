import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { getPublicRoundBySlug, getRoundVoteUsage, getRoundVotingPower } from "@/services/rounds";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const wallet = new URL(request.url).searchParams.get("wallet");

  try {
    if (!isValidRoundSlug(slug)) {
      return NextResponse.json({ error: "Use a valid round slug." }, { status: 400 });
    }

    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ error: "Use a valid wallet address." }, { status: 400 });
    }

    const walletAddress = getAddress(wallet);
    const round = await getPublicRoundBySlug(slug);
    if (!round) return NextResponse.json({ error: "Round not found." }, { status: 404 });

    const [votingPower, usedVotes] = await Promise.all([
      getRoundVotingPower(round, walletAddress),
      getRoundVoteUsage(round.id, walletAddress),
    ]);

    return NextResponse.json({
      walletAddress,
      votingPower,
      usedVotes,
      remainingVotes: Math.max(votingPower - usedVotes, 0),
    });
  } catch (error) {
    console.error("[rounds] voting power lookup failed", error);
    return NextResponse.json({ error: "Unable to load voting power." }, { status: 500 });
  }
}

function isValidRoundSlug(slug: string) {
  return /^[a-z0-9-]+$/.test(slug);
}
