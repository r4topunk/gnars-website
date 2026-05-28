import { NextResponse } from "next/server";
import { verifyRoundActionSignature } from "@/features/rounds/verify-signature";
import { createRoundSubmission } from "@/services/rounds";

type SubmitBody = {
  walletAddress?: string;
  issuedAt?: string;
  signature?: `0x${string}`;
  submission?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
  };
};

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await request.json()) as SubmitBody;
  const path = `/api/rounds/${slug}/submit`;
  const payload = {
    walletAddress: body.walletAddress,
    submission: body.submission,
  };

  try {
    if (!body.walletAddress || !body.issuedAt || !body.signature) {
      return NextResponse.json({ error: "Signed wallet request is required." }, { status: 401 });
    }

    const verified = await verifyRoundActionSignature({
      action: "submit",
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

    const submission = await createRoundSubmission(slug, {
      walletAddress: body.walletAddress,
      title: body.submission?.title || "",
      description: body.submission?.description || "",
      image: body.submission?.image || "",
      url: body.submission?.url || "",
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit to round.";
    console.error("[rounds] submission failed", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
