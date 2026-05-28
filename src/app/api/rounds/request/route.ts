import { NextResponse } from "next/server";
import type { RoundRequestInput } from "@/features/rounds/types";
import { verifyRoundActionSignature } from "@/features/rounds/verify-signature";
import { createRoundRequest } from "@/services/rounds";

type RequestBody = {
  walletAddress?: string;
  issuedAt?: string;
  signature?: `0x${string}`;
  request?: Partial<RoundRequestInput>;
};

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody;
  const path = "/api/rounds/request";
  const payload = {
    walletAddress: body.walletAddress,
    request: body.request,
  };

  try {
    if (!body.walletAddress || !body.issuedAt || !body.signature) {
      return NextResponse.json({ error: "Signed wallet request is required." }, { status: 401 });
    }

    const verified = await verifyRoundActionSignature({
      action: "request",
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

    const roundRequest = await createRoundRequest({
      walletAddress: body.walletAddress,
      requesterName: body.request?.requesterName || "",
      requesterEmail: body.request?.requesterEmail || "",
      requestedSlug: body.request?.requestedSlug || "",
      title: body.request?.title || "",
      description: body.request?.description || "",
      content: body.request?.content || "",
      image: body.request?.image || "",
      url: body.request?.url || "",
      timeline: body.request?.timeline || "",
      submissionsOpenAt: body.request?.submissionsOpenAt || "",
      votingStartsAt: body.request?.votingStartsAt || "",
      votingEndsAt: body.request?.votingEndsAt || "",
      votingStrategy: body.request?.votingStrategy || "fixed_per_wallet",
      votesPerWallet: Number(body.request?.votesPerWallet || 1),
      winnerCount: Number(body.request?.winnerCount || 1),
      maxSubmissionsPerWallet: Number(body.request?.maxSubmissionsPerWallet || 1),
      awards: body.request?.awards || [],
    });

    return NextResponse.json({ request: roundRequest }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to request round.";
    console.error("[rounds] request failed", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
