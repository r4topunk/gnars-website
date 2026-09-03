import type { NextRequest } from "next/server";
import { answerSwapProQuote } from "@/lib/swapproRoute";

/** GET /api/0x/quote — the firm quote with the transaction to sign. Same call as /price; see src/lib/swapproRoute.ts. */
export async function GET(request: NextRequest) {
  return answerSwapProQuote(request);
}
