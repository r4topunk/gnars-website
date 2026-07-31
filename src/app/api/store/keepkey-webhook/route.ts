import { NextResponse, type NextRequest } from "next/server";
import { dropshipWebhookSchema } from "@/lib/schemas/dropship";
import { verifyWebhookSignature } from "@/services/keepkey-dropship";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inbound KeepKey fulfillment webhook (order.received | processing | shipped | cancelled | failed).
 * Verifies the HMAC-SHA256 `X-KeepKey-Signature` before trusting the payload.
 *
 * TODO(inventory): persist status/tracking (DB) and notify the customer + revalidate any
 * order-status UI. For now we verify + log; there is no order store yet.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-keepkey-signature");

  const { valid, reason } = verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: { code: "unauthorized", message: reason } }, { status: 401 });
  }

  let event;
  try {
    event = dropshipWebhookSchema.parse(JSON.parse(rawBody));
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Malformed webhook payload" } },
      { status: 400 },
    );
  }

  if (reason === "unverified-sandbox-no-secret") {
    console.warn("[keepkey-webhook] accepted UNVERIFIED (sandbox, no secret set)");
  }
  console.log(
    `[keepkey-webhook] ${event.eventType} order=${event.keepKeyOrderId} ext=${event.externalOrderId} status=${event.status} tracking=${event.trackingNumber ?? "-"}`,
  );

  return NextResponse.json({ received: true });
}
