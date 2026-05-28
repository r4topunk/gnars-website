import { NextResponse } from "next/server";
import { isRoundAdminAddress } from "@/features/rounds/admin";
import { verifyRoundActionSignature } from "@/features/rounds/verify-signature";
import { approveRoundRequest, rejectRoundRequest } from "@/services/rounds";

type ReviewBody = {
  walletAddress?: string;
  issuedAt?: string;
  signature?: `0x${string}`;
  requestId?: string;
  decision?: "approve" | "reject";
};

// Approve (→ create a published round) or reject a pending round request.
// Gated on an approved-admin wallet signature. The signed payload binds the
// requestId and decision, so a list/auth signature cannot be replayed here.
export async function POST(request: Request) {
  const path = "/api/rounds/admin/request-review";

  try {
    const body = (await request.json()) as ReviewBody;

    if (!body.walletAddress || !body.issuedAt || !body.signature) {
      return NextResponse.json({ error: "Signed admin request is required." }, { status: 401 });
    }

    if (!body.requestId || (body.decision !== "approve" && body.decision !== "reject")) {
      return NextResponse.json(
        { error: "A request id and decision are required." },
        { status: 400 },
      );
    }

    if (!isRoundAdminAddress(body.walletAddress)) {
      return NextResponse.json(
        { error: "This wallet is not on the approved Rounds admin list." },
        { status: 403 },
      );
    }

    const verified = await verifyRoundActionSignature({
      action: "admin",
      method: "POST",
      path,
      walletAddress: body.walletAddress,
      payload: {
        walletAddress: body.walletAddress,
        requestId: body.requestId,
        decision: body.decision,
      },
      issuedAt: body.issuedAt,
      signature: body.signature,
    });

    if (!verified) {
      return NextResponse.json({ error: "Invalid wallet signature." }, { status: 401 });
    }

    if (body.decision === "approve") {
      const round = await approveRoundRequest(body.requestId);
      return NextResponse.json({ ok: true, round });
    }

    await rejectRoundRequest(body.requestId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to review round request.";
    console.error("[rounds] request review failed", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
