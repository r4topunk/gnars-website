import { NextResponse } from "next/server";
import { isRoundAdminAddress } from "@/features/rounds/admin";
import { verifyRoundActionSignature } from "@/features/rounds/verify-signature";
import { listRoundRequests } from "@/services/rounds";

type AdminRequestsBody = {
  walletAddress?: string;
  issuedAt?: string;
  signature?: `0x${string}`;
};

// Returns round requests (which include requester name + email PII) only to an
// approved admin wallet that proves control via a fresh signed message. This
// keeps PII out of the publicly-served admin page payload.
export async function POST(request: Request) {
  const path = "/api/rounds/admin/requests";

  try {
    const body = (await request.json()) as AdminRequestsBody;

    if (!body.walletAddress || !body.issuedAt || !body.signature) {
      return NextResponse.json({ error: "Signed admin request is required." }, { status: 401 });
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
      payload: { walletAddress: body.walletAddress },
      issuedAt: body.issuedAt,
      signature: body.signature,
    });

    if (!verified) {
      return NextResponse.json({ error: "Invalid wallet signature." }, { status: 401 });
    }

    const requests = await listRoundRequests();
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("[rounds] admin requests failed", error);
    return NextResponse.json({ error: "Unable to load round requests." }, { status: 500 });
  }
}
