import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDropshipOrderByExternalId,
  verifyWebhookSignature,
  WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
} from "./keepkey-dropship";

const SECRET = "whsec_test_secret";
const NOW_MS = 1_800_000_000_000; // fixed clock for deterministic timestamp checks
const NOW_S = Math.floor(NOW_MS / 1000);

function sign(rawBody: string, ts: number, secret = SECRET): string {
  const v1 = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  return `t=${ts},v1=${v1}`;
}

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ eventType: "order.received", keepKeyOrderId: "kk_1" });

  beforeEach(() => {
    process.env.KEEPKEY_DROPSHIP_MODE = "live";
    process.env.KEEPKEY_DROPSHIP_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.KEEPKEY_DROPSHIP_WEBHOOK_SECRET;
    delete process.env.KEEPKEY_DROPSHIP_MODE;
  });

  it("accepts a correctly signed, fresh payload", () => {
    const header = sign(body, NOW_S);
    expect(verifyWebhookSignature(body, header, NOW_MS)).toEqual({
      valid: true,
      reason: "verified",
    });
  });

  it("rejects a tampered body", () => {
    const header = sign(body, NOW_S);
    const res = verifyWebhookSignature(body + " ", header, NOW_MS);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("signature-mismatch");
  });

  it("rejects a stale timestamp beyond tolerance (replay)", () => {
    const staleTs = NOW_S - WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS - 1;
    const header = sign(body, staleTs);
    expect(verifyWebhookSignature(body, header, NOW_MS)).toEqual({
      valid: false,
      reason: "stale-timestamp",
    });
  });

  it("accepts a timestamp at the tolerance edge", () => {
    const edgeTs = NOW_S - WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS;
    const header = sign(body, edgeTs);
    expect(verifyWebhookSignature(body, header, NOW_MS).valid).toBe(true);
  });

  it("rejects a valid signature made with the wrong secret", () => {
    const header = sign(body, NOW_S, "whsec_attacker");
    expect(verifyWebhookSignature(body, header, NOW_MS).valid).toBe(false);
  });

  it("rejects a malformed header missing v1", () => {
    expect(verifyWebhookSignature(body, `t=${NOW_S}`, NOW_MS)).toEqual({
      valid: false,
      reason: "malformed-signature",
    });
  });

  it("rejects when no signature header is present", () => {
    expect(verifyWebhookSignature(body, null, NOW_MS).reason).toBe("missing-signature");
  });

  it("rejects in live mode when no secret is configured", () => {
    delete process.env.KEEPKEY_DROPSHIP_WEBHOOK_SECRET;
    expect(verifyWebhookSignature(body, sign(body, NOW_S), NOW_MS)).toEqual({
      valid: false,
      reason: "no-secret-configured",
    });
  });

  it("allows (unverified) in sandbox mode when no secret is configured", () => {
    delete process.env.KEEPKEY_DROPSHIP_WEBHOOK_SECRET;
    process.env.KEEPKEY_DROPSHIP_MODE = "test";
    expect(verifyWebhookSignature(body, null, NOW_MS)).toEqual({
      valid: true,
      reason: "unverified-sandbox-no-secret",
    });
  });
});

describe("getDropshipOrderByExternalId", () => {
  beforeEach(() => {
    process.env.KEEPKEY_DROPSHIP_MODE = "test";
    process.env.KEEPKEY_DROPSHIP_TEST_TOKEN = "kk_ds_test_x";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KEEPKEY_DROPSHIP_TEST_TOKEN;
    delete process.env.KEEPKEY_DROPSHIP_MODE;
  });

  function mockFetch(json: unknown) {
    return vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(json), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
  }

  it("unwraps a single-record response and encodes the query", async () => {
    const record = { keepKeyOrderId: "kk_1", externalOrderId: "gnars-1001", status: "shipped" };
    const spy = mockFetch(record);
    const out = await getDropshipOrderByExternalId("gnars 1001");
    expect(out).toEqual(record);
    expect(spy.mock.calls[0][0]).toContain("/orders?externalOrderId=gnars%201001");
  });

  it("unwraps an { orders: [...] } collection response", async () => {
    const record = { keepKeyOrderId: "kk_2", externalOrderId: "gnars-1002", status: "received" };
    mockFetch({ orders: [record] });
    expect(await getDropshipOrderByExternalId("gnars-1002")).toEqual(record);
  });

  it("returns null for an empty collection response", async () => {
    mockFetch({ orders: [] });
    expect(await getDropshipOrderByExternalId("gnars-none")).toBeNull();
  });
});
