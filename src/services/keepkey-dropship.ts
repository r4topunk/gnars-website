import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  dropshipOrderInputSchema,
  type DropshipOrderInput,
  type DropshipOrderRecord,
  type DropshipOrderResult,
  type DropshipProduct,
} from "@/lib/schemas/dropship";

/**
 * Server-side client for the KeepKey Dropship / fulfillment API.
 *
 * Docs: https://affiliates.keepkey.com/dropship/docs (see docs/integrations/keepkey-fulfillment.md).
 * Auth is a bearer token; `KEEPKEY_DROPSHIP_MODE` selects the sandbox (test) or live token.
 * The test token hits the same endpoints but flags every write `sandbox: true` — it never
 * ships, draws credit, or allocates a settlement. NEVER import this into client code.
 */

const DEFAULT_BASE_URL = "https://affiliates.keepkey.com/api/dropship/v1";

/** Reserved SKU that is always orderable in sandbox and never actually ships. */
export const DROPSHIP_SANDBOX_SKU = "KK-TEST-001";

export function isSandbox(): boolean {
  return (process.env.KEEPKEY_DROPSHIP_MODE ?? "test") !== "live";
}

function baseUrl(): string {
  return (process.env.KEEPKEY_DROPSHIP_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function token(): string | null {
  return (
    (isSandbox()
      ? process.env.KEEPKEY_DROPSHIP_TEST_TOKEN
      : process.env.KEEPKEY_DROPSHIP_LIVE_TOKEN) ?? null
  );
}

/** Whether the client has a usable token for the current mode. */
export function isDropshipConfigured(): boolean {
  return Boolean(token());
}

/** Error carrying the upstream HTTP status + KeepKey error code (e.g. out_of_stock). */
export class DropshipApiError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "DropshipApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const bearer = token();
  if (!bearer) {
    throw new DropshipApiError(
      503,
      "not_configured",
      `KEEPKEY_DROPSHIP_${isSandbox() ? "TEST" : "LIVE"}_TOKEN is not set`,
    );
  }

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON body
  }

  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string } })?.error;
    throw new DropshipApiError(res.status, err?.code, err?.message || res.statusText);
  }
  return json as T;
}

export function listDropshipProducts(): Promise<{ products: DropshipProduct[] }> {
  return request<{ products: DropshipProduct[] }>("/products");
}

export function getDropshipProduct(sku: string): Promise<DropshipProduct> {
  return request<DropshipProduct>(`/products/${encodeURIComponent(sku)}`);
}

/** Forward a paid order to KeepKey for fulfillment. Validates the payload first. */
export function createDropshipOrder(input: DropshipOrderInput): Promise<DropshipOrderResult> {
  const body = dropshipOrderInputSchema.parse(input);
  return request<DropshipOrderResult>("/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getDropshipOrder(keepKeyOrderId: string): Promise<DropshipOrderRecord> {
  return request<DropshipOrderRecord>(`/orders/${encodeURIComponent(keepKeyOrderId)}`);
}

/**
 * Look up an order by our own `externalOrderId` (the idempotency key we set on creation).
 *
 * This is the ONLY way to learn a live order's shipment status today: per the 2026-07-15
 * go-live handoff, KeepKey's `order.shipped` webhook does not fire yet, so callers poll
 * this a few times a day and read `status` / `trackingNumber` / `trackingUrl` / `carrier`.
 * The live response also carries the order's `settlement` block, so a lost create-order
 * response is recoverable here. Returns null when no order matches that id.
 */
export async function getDropshipOrderByExternalId(
  externalOrderId: string,
): Promise<DropshipOrderRecord | null> {
  const res = await request<DropshipOrderRecord | { orders: DropshipOrderRecord[] }>(
    `/orders?externalOrderId=${encodeURIComponent(externalOrderId)}`,
  );
  // The filtered endpoint may return the record directly or wrapped as { orders: [...] }.
  if (res && typeof res === "object" && "orders" in res) {
    return res.orders[0] ?? null;
  }
  return (res as DropshipOrderRecord) ?? null;
}

/** Max clock skew tolerated on a webhook's signed timestamp before it's treated as a replay. */
export const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

/**
 * Verify an inbound webhook's `X-KeepKey-Signature`. Per the go-live handoff, KeepKey signs
 * Stripe-style: the header is `t=<unix>,v1=<hex>`, and `v1` is the HMAC-SHA256 of
 * `${t}.${rawBody}` keyed by KEEPKEY_DROPSHIP_WEBHOOK_SECRET, computed over the **raw**
 * request body. We also reject deliveries whose timestamp is older (or newer) than
 * WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS to defeat replays.
 *
 * `nowMs` is injectable for tests; it defaults to the current time.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  nowMs: number = Date.now(),
): { valid: boolean; reason: string } {
  const secret = process.env.KEEPKEY_DROPSHIP_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured: never trust in live; allow (with a warning) only in sandbox dev.
    return isSandbox()
      ? { valid: true, reason: "unverified-sandbox-no-secret" }
      : { valid: false, reason: "no-secret-configured" };
  }
  if (!signatureHeader) return { valid: false, reason: "missing-signature" };

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => {
      const [k, ...v] = kv.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts["t"];
  const provided = parts["v1"];
  if (!ts || !provided) return { valid: false, reason: "malformed-signature" };

  const tsSeconds = Number(ts);
  if (!Number.isFinite(tsSeconds)) return { valid: false, reason: "malformed-timestamp" };
  if (Math.abs(nowMs / 1000 - tsSeconds) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) {
    return { valid: false, reason: "stale-timestamp" };
  }

  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  if (safeEqualHex(expected, provided)) return { valid: true, reason: "verified" };
  return { valid: false, reason: "signature-mismatch" };
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length === 0 || ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
