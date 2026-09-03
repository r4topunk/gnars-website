import type { NextRequest } from "next/server";
import { answerSwapProQuote } from "@/lib/swapproRoute";

/** GET /api/0x/price — an indicative quote from SwapPro, in the shape the widget reads. See src/lib/swapproRoute.ts. */
export async function GET(request: NextRequest) {
  return answerSwapProQuote(request);
}
