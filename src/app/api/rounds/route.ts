import { NextResponse } from "next/server";
import { listPublicRounds } from "@/services/rounds";

export async function GET() {
  try {
    const rounds = await listPublicRounds();
    return NextResponse.json({ rounds });
  } catch (error) {
    console.error("[rounds] load failed", error);
    return NextResponse.json({ error: "Unable to load rounds." }, { status: 500 });
  }
}
