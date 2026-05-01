import { NextResponse, type NextRequest } from "next/server";
import { getSwapFeeRecipient, SWAP_FEE_BPS } from "@/lib/config";

// Server-only API key — never leaked to the client bundle.
const ZEROX_API_KEY = process.env.ZEROX_API_KEY ?? "";

// Fee recipient is chain-aware: Base → DAO treasury, others → multichain
// custody address. See `getSwapFeeRecipient` in src/lib/config.ts.
const FEE_BPS = String(SWAP_FEE_BPS);

const ZEROX_HEADERS: HeadersInit = {
  "0x-api-key": ZEROX_API_KEY,
  "0x-version": "v2",
  "Content-Type": "application/json",
};

/**
 * GET /api/0x/price — proxy for 0x's allowance-holder/price endpoint.
 *
 * Forwards every query param through, with two server-side adjustments:
 *   1. Strips `fee=1` so it doesn't reach 0x.
 *   2. When the client opted in (`fee=1`), injects affiliate fee params
 *      (`swapFeeRecipient` = DAO treasury, `swapFeeBps` = SWAP_FEE_BPS,
 *      `swapFeeToken` = buyToken).
 *
 * Required upstream params: chainId, sellToken, buyToken, sellAmount, taker.
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
    const chainId = Number(params.get("chainId") ?? "0");
    if (buyToken && Number.isFinite(chainId) && chainId > 0) {
      params.set("swapFeeRecipient", getSwapFeeRecipient(chainId));
      params.set("swapFeeBps", FEE_BPS);
      params.set("swapFeeToken", buyToken);
    }
  }

  const upstream = `https://api.0x.org/swap/allowance-holder/price?${params.toString()}`;

  try {
    const res = await fetch(upstream, { headers: ZEROX_HEADERS });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
