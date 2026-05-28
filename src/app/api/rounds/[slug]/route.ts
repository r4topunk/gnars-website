import { NextResponse } from "next/server";
import { getPublicRoundBySlug } from "@/services/rounds";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const round = await getPublicRoundBySlug(slug);
    if (!round) return NextResponse.json({ error: "Round not found." }, { status: 404 });

    return NextResponse.json({ round });
  } catch (error) {
    console.error("[rounds] detail load failed", error);
    return NextResponse.json({ error: "Unable to load round." }, { status: 500 });
  }
}
