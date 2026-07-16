import { NextResponse, type NextRequest } from "next/server";
import { dropshipOrderInputSchema } from "@/lib/schemas/dropship";
import {
  createDropshipOrder,
  DropshipApiError,
  getDropshipOrderByExternalId,
  isDropshipConfigured,
  isSandbox,
} from "@/services/keepkey-dropship";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Poll fulfillment status/tracking for an order by our own `externalOrderId`.
 *
 * This is the supported way to track a live order until KeepKey's `order.shipped` webhook
 * ships (it doesn't fire yet). The response also carries the `settlement` block, so an
 * order's crypto deposit details are recoverable here.
 */
export async function GET(request: NextRequest) {
  if (!isDropshipConfigured()) {
    return NextResponse.json(
      { error: { code: "not_configured", message: "KeepKey dropship token is not set" } },
      { status: 503 },
    );
  }

  const externalOrderId = request.nextUrl.searchParams.get("externalOrderId");
  if (!externalOrderId) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "externalOrderId query param is required" } },
      { status: 400 },
    );
  }

  try {
    const order = await getDropshipOrderByExternalId(externalOrderId);
    if (!order) {
      return NextResponse.json(
        { error: { code: "not_found", message: "No order for that externalOrderId" } },
        { status: 404 },
      );
    }
    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof DropshipApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }
    console.error("getDropshipOrderByExternalId failed:", error);
    return NextResponse.json(
      { error: { code: "server_error", message: "Failed to fetch order" } },
      { status: 502 },
    );
  }
}

/**
 * Forward a paid order to KeepKey for fulfillment.
 *
 * TODO(checkout): this route is meant to run AFTER payment settles on the Gnars side.
 * Until checkout exists, live-mode creation (which draws the KeepKey credit line and
 * ships a real device) is gated behind KEEPKEY_DROPSHIP_INTERNAL_SECRET so it can't be
 * called by the public. Sandbox (KEEPKEY_DROPSHIP_MODE=test) is open for dry-runs.
 */
export async function POST(request: NextRequest) {
  if (!isDropshipConfigured()) {
    return NextResponse.json(
      { error: { code: "not_configured", message: "KeepKey dropship token is not set" } },
      { status: 503 },
    );
  }

  if (!isSandbox()) {
    const secret = process.env.KEEPKEY_DROPSHIP_INTERNAL_SECRET;
    const provided = request.headers.get("x-gnars-internal");
    if (!secret || provided !== secret) {
      return NextResponse.json(
        {
          error: {
            code: "forbidden",
            message:
              "Live order creation requires internal authorization (payment gate not built yet)",
          },
        },
        { status: 403 },
      );
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = dropshipOrderInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: { code: "invalid_request", message: "Invalid order payload" },
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  try {
    const result = await createDropshipOrder(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DropshipApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }
    console.error("createDropshipOrder failed:", error);
    return NextResponse.json(
      { error: { code: "server_error", message: "Failed to create order" } },
      { status: 502 },
    );
  }
}
