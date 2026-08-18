import { NextRequest, NextResponse } from "next/server";
import { loadTreasuryInflowsPage } from "@/services/treasury-inflows";

/**
 * Deeper inflow history for the client-side pager, one indexer page per call.
 *
 * `pageKey` is Alchemy's opaque cursor, handed to the client by the previous
 * page. Pages are append-only history, so a short CDN window is safe — but a
 * FAILED page must answer 500 with no-store, never an empty 200: an empty page
 * with no cursor reads as "history complete", and caching that lie is the same
 * bug class as the empty backer list on /stake.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pageKey = req.nextUrl.searchParams.get("pageKey") ?? undefined;
  try {
    const page = await loadTreasuryInflowsPage(pageKey);
    return NextResponse.json(page, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json(
      { error: "inflows_page_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
