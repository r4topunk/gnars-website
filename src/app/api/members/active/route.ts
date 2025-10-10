import { NextResponse } from "next/server";
import { fetchActiveMembers, type ActiveMember } from "@/services/members";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query params with defaults
    const windowParam = searchParams.get("window");
    const thresholdParam = searchParams.get("threshold");
    
    const window = windowParam ? parseInt(windowParam, 10) : 10;
    const threshold = thresholdParam ? parseInt(thresholdParam, 10) : 5;

    // Validate params
    if (isNaN(window) || window < 1 || window > 100) {
      return NextResponse.json(
        { error: "Invalid window parameter. Must be between 1 and 100." },
        { status: 400 },
      );
    }

    if (isNaN(threshold) || threshold < 1 || threshold > window) {
      return NextResponse.json(
        { error: `Invalid threshold parameter. Must be between 1 and ${window}.` },
        { status: 400 },
      );
    }

    const activeMembers: ActiveMember[] = await fetchActiveMembers(window, threshold);

    return NextResponse.json({ activeMembers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to fetch active members:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

