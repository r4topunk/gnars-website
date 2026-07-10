import { NextResponse, type NextRequest } from "next/server";
import {
  DropshipApiError,
  getDropshipOrder,
  isDropshipConfigured,
} from "@/services/keepkey-dropship";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fetch fulfillment status for a KeepKey order (keepKeyOrderId). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isDropshipConfigured()) {
    return NextResponse.json(
      { error: { code: "not_configured", message: "KeepKey dropship token is not set" } },
      { status: 503 },
    );
  }

  try {
    const order = await getDropshipOrder(id);
    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof DropshipApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus },
      );
    }
    console.error("getDropshipOrder failed:", error);
    return NextResponse.json(
      { error: { code: "server_error", message: "Failed to fetch order" } },
      { status: 502 },
    );
  }
}
