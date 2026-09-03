import { NextResponse, type NextRequest } from "next/server";
import { getSwapFeeRecipient, SWAP_FEE_BPS } from "@/lib/config";
import { fetchWidgetQuote } from "@/lib/swappro";

/**
 * The one handler behind /api/0x/price and /api/0x/quote.
 *
 * SwapPro has a single /quote: every answer is firm and carries the
 * transaction when a same-chain route exists, so the indicative price and
 * the executed quote are the same call and cannot disagree. Both routes keep
 * their old paths so the widget does not change. There is no API key; the
 * route stays a proxy so the fee recipient is set here, from config, and not
 * in the client bundle.
 *
 * Params: chainId, sellToken, buyToken, sellAmount (base units), taker,
 * sellDecimals, buyDecimals, and `fee=1` to opt in to the affiliate fee.
 */
export async function answerSwapProQuote(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const chainId = Number(q.get("chainId") ?? "0");
  const sellToken = q.get("sellToken") ?? "";
  const buyToken = q.get("buyToken") ?? "";
  const sellAmount = q.get("sellAmount") ?? "";
  const taker = q.get("taker") ?? "";
  const sellDecimals = Number(q.get("sellDecimals") ?? "18");
  const buyDecimals = Number(q.get("buyDecimals") ?? "18");

  if (!chainId || !sellToken || !buyToken || !/^\d+$/.test(sellAmount) || !taker) {
    return NextResponse.json(
      {
        liquidityAvailable: false,
        reason: "chainId, sellToken, buyToken, sellAmount and taker are required",
        code: "BAD_REQUEST",
      },
      { status: 400 },
    );
  }

  const fee =
    q.get("fee") === "1" ? { recipient: getSwapFeeRecipient(chainId), bps: SWAP_FEE_BPS } : null;

  try {
    const { status, body } = await fetchWidgetQuote({
      chainId,
      sellToken,
      buyToken,
      sellAmount,
      sellDecimals,
      buyDecimals,
      taker,
      fee,
    });
    return NextResponse.json(body, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "SwapPro did not answer";
    return NextResponse.json(
      { liquidityAvailable: false, reason: message, code: "UPSTREAM_UNAVAILABLE" },
      { status: 502 },
    );
  }
}
