import { NextResponse, type NextRequest } from "next/server";
import { sendOrderReceiptEmail } from "@/lib/email/order-receipt";
import { checkoutInputSchema, type CheckoutResult } from "@/lib/schemas/checkout";
import { isDropshipFulfillable } from "@/lib/store/fulfillment";
import {
  createDropshipOrder,
  DROPSHIP_SANDBOX_SKU,
  DropshipApiError,
  isDropshipConfigured,
  isSandbox,
} from "@/services/keepkey-dropship";
import { getProductBySlug } from "@/services/store";
import { verifyUsdcPayment } from "@/services/store-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Customer checkout: verify payment (live) then forward a fulfillment order to KeepKey.
 *
 * - **Sandbox** (`KEEPKEY_DROPSHIP_MODE=test`): no payment is collected. Places a
 *   `KK-TEST-001` sandbox order so the full UX is testable for free. Never ships.
 * - **Live**: requires `txHash` of a USDC-on-Base payment to the store checkout wallet,
 *   re-verified server-side for ≥ the retail price. The order's `externalOrderId` is
 *   derived from the tx hash, so a given payment can only ever place one order (KeepKey
 *   dedupes on `externalOrderId`).
 *
 * This route IS the payment gate the raw `/api/store/orders` live path warns about, so it
 * calls the fulfillment client directly once payment checks out.
 */
export async function POST(request: NextRequest) {
  if (!isDropshipConfigured()) {
    return NextResponse.json(
      { error: { code: "not_configured", message: "Store fulfillment is not configured" } },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = checkoutInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: { code: "invalid_request", message: "Invalid checkout payload" },
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const product = await getProductBySlug(input.slug);
  if (!product) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Product not found" } },
      { status: 404 },
    );
  }
  if (!isDropshipFulfillable(product.fulfillmentSku)) {
    return NextResponse.json(
      {
        error: {
          code: "unsupported_product",
          message: "This product isn't available for checkout yet",
        },
      },
      { status: 400 },
    );
  }

  const sandbox = isSandbox();
  let externalOrderId: string;

  if (sandbox) {
    // No payment in sandbox — random id is fine since nothing is charged or shipped.
    externalOrderId = `gnars-web-sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } else {
    if (!input.txHash) {
      return NextResponse.json(
        { error: { code: "payment_required", message: "A payment transaction hash is required" } },
        { status: 402 },
      );
    }
    const payment = await verifyUsdcPayment(input.txHash, product.price);
    if (!payment.ok) {
      const status = payment.code === "not_configured" ? 503 : 402;
      return NextResponse.json(
        { error: { code: payment.code, message: payment.message } },
        { status },
      );
    }
    // Deterministic id from the payment → same tx can never place two orders.
    externalOrderId = `gnars-${input.txHash}`;
  }

  // KeepKey's dropship catalog only stocks the base wallet; color finishes are cosmetic and
  // fulfill as the same SKU, with the finish passed along in notes.
  const sku = sandbox ? DROPSHIP_SANDBOX_SKU : product.fulfillmentSku;
  const notes = input.finish ? `Finish: ${input.finish}` : undefined;

  try {
    const result = await createDropshipOrder({
      externalOrderId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      shippingAddress: input.shippingAddress,
      lineItems: [{ sku, quantity: 1 }],
      shippingMethod: "standard",
      notes,
    });

    // Best-effort order receipt — never let a mail failure fail an order that's placed.
    await sendOrderReceiptEmail({
      to: input.customerEmail,
      customerName: input.customerName,
      productTitle: product.title,
      finish: input.finish || undefined,
      amount: product.price,
      currency: product.currency,
      keepKeyOrderId: result.keepKeyOrderId,
      externalOrderId,
      shippingAddress: input.shippingAddress,
      sandbox: result.sandbox,
    });

    const payload: CheckoutResult = {
      keepKeyOrderId: result.keepKeyOrderId,
      externalOrderId,
      status: result.status,
      sandbox: result.sandbox,
    };
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (error instanceof DropshipApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }
    console.error("store checkout order failed:", error);
    return NextResponse.json(
      { error: { code: "server_error", message: "Failed to place order" } },
      { status: 502 },
    );
  }
}
