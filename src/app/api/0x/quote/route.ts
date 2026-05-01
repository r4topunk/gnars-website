import { NextResponse, type NextRequest } from "next/server";
import { DAO_ADDRESSES, SWAP_FEE_BPS } from "@/lib/config";

// Server-only API key — never leaked to the client bundle.
const ZEROX_API_KEY = process.env.ZEROX_API_KEY ?? "";

// Fee recipient + rate live in src/lib/config.ts; the recipient is the DAO
// treasury (overridable via NEXT_PUBLIC_TREASURY_ADDRESS).
const FEE_RECIPIENT = DAO_ADDRESSES.treasury;
const FEE_BPS = String(SWAP_FEE_BPS);

const ZEROX_HEADERS: HeadersInit = {
  "0x-api-key": ZEROX_API_KEY,
  "0x-version": "v2",
  "Content-Type": "application/json",
};

/**
 * GET /api/0x/quote — proxy for 0x's allowance-holder/quote endpoint.
 *
 * Mirrors the fee-injection logic in /api/0x/price exactly. Both endpoints
 * MUST inject the same fee params (or omit them) so the price preview and
 * the firm quote remain consistent.
 */
export async function GET(request: NextRequest) {
  if (!ZEROX_API_KEY) {
    return NextResponse.json(
      { error: "ZEROX_API_KEY is not configured on the server" },
      { status: 500 },
    );
  }

  const params = new URLSearchParams(request.nextUrl.searchParams);
  const wantsFee = params.get("fee") === "1";
  params.delete("fee");

  if (wantsFee) {
    const buyToken = params.get("buyToken") ?? "";
    if (buyToken) {
      params.set("swapFeeRecipient", FEE_RECIPIENT);
      params.set("swapFeeBps", FEE_BPS);
      params.set("swapFeeToken", buyToken);
    }
  }

  const upstream = `https://api.0x.org/swap/allowance-holder/quote?${params.toString()}`;

  try {
    const res = await fetch(upstream, { headers: ZEROX_HEADERS });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
