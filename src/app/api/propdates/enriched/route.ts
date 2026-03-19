import { NextResponse } from "next/server";
import { getEnrichedPropdatesFeed } from "@/services/propdates-enriched";

export const revalidate = 60;

export async function GET() {
  try {
    const data = await getEnrichedPropdatesFeed();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch enriched propdates feed:", error);
    return NextResponse.json({ error: "Failed to fetch enriched propdates feed" }, { status: 500 });
  }
}
