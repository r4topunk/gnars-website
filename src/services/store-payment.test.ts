import { encodeAbiParameters, parseUnits, type Hex } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Imported after mocks are registered.
import { verifyUsdcPayment } from "./store-payment";

// Hoisted so the vi.mock factories (also hoisted) can reference them.
const { RECIPIENT, OTHER, FROM, USDC, TRANSFER_TOPIC, waitForTransactionReceipt } = vi.hoisted(
  () => ({
    RECIPIENT: "0x1111111111111111111111111111111111111111",
    OTHER: "0x2222222222222222222222222222222222222222",
    FROM: "0x3333333333333333333333333333333333333333",
    USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // Base USDC (matches config)
    TRANSFER_TOPIC: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    waitForTransactionReceipt: vi.fn(),
  }),
);

vi.mock("@/lib/config", () => ({
  STORE_CHECKOUT: { usdc: USDC, usdcDecimals: 6, recipient: RECIPIENT },
}));

vi.mock("@/lib/rpc", () => ({
  serverPublicClient: { waitForTransactionReceipt },
}));

function addrTopic(addr: string): Hex {
  return `0x${addr.slice(2).toLowerCase().padStart(64, "0")}` as Hex;
}

function transferLog(to: string, amountUsd: string, token = USDC) {
  return {
    address: token,
    topics: [TRANSFER_TOPIC, addrTopic(FROM), addrTopic(to)],
    data: encodeAbiParameters([{ type: "uint256" }], [parseUnits(amountUsd, 6)]),
  };
}

// A confirmed, successful receipt carrying the given transfer logs.
function receipt(logs: ReturnType<typeof transferLog>[], status = "success") {
  return { status, blockNumber: 999n, logs };
}

const TX = "0x" + "a".repeat(64);

describe("verifyUsdcPayment", () => {
  beforeEach(() => waitForTransactionReceipt.mockReset());
  afterEach(() => vi.clearAllMocks());

  it("accepts an exact-amount USDC transfer to the checkout wallet", async () => {
    waitForTransactionReceipt.mockResolvedValue(receipt([transferLog(RECIPIENT, "59.95")]));
    const res = await verifyUsdcPayment(TX, 59.95);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.amount).toBe(parseUnits("59.95", 6));
  });

  it("accepts an overpayment", async () => {
    waitForTransactionReceipt.mockResolvedValue(receipt([transferLog(RECIPIENT, "60")]));
    expect((await verifyUsdcPayment(TX, 59.95)).ok).toBe(true);
  });

  it("rejects an underpayment", async () => {
    waitForTransactionReceipt.mockResolvedValue(receipt([transferLog(RECIPIENT, "59.94")]));
    expect(await verifyUsdcPayment(TX, 59.95)).toMatchObject({
      ok: false,
      code: "no_matching_transfer",
    });
  });

  it("rejects a transfer to a different address", async () => {
    waitForTransactionReceipt.mockResolvedValue(receipt([transferLog(OTHER, "59.95")]));
    expect((await verifyUsdcPayment(TX, 59.95)).ok).toBe(false);
  });

  it("rejects the right amount in the wrong token", async () => {
    waitForTransactionReceipt.mockResolvedValue(receipt([transferLog(RECIPIENT, "59.95", OTHER)]));
    expect((await verifyUsdcPayment(TX, 59.95)).ok).toBe(false);
  });

  it("rejects a reverted transaction", async () => {
    waitForTransactionReceipt.mockResolvedValue(receipt([], "reverted"));
    expect(await verifyUsdcPayment(TX, 59.95)).toMatchObject({ ok: false, code: "reverted" });
  });

  it("rejects a tx that never appears/confirms within the timeout", async () => {
    // viem's waitForTransactionReceipt throws on timeout / not found.
    waitForTransactionReceipt.mockImplementationOnce(() => Promise.reject(new Error("timeout")));
    expect(await verifyUsdcPayment(TX, 59.95)).toMatchObject({ ok: false, code: "not_found" });
  });
});
