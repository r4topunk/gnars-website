import { describe, expect, it } from "vitest";
import {
  buildQuoteUrl,
  NATIVE_SENTINEL,
  toSwapProToken,
  toWidgetError,
  toWidgetQuote,
  type SwapProQuote,
} from "./swappro";

const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const TAKER = "0x21c9a94AF76B59b171b32fD125A4edF0e9A2Ad3e";

// Captured from https://www.swaps.pro/api/sdk/v1/quote on 2026-09-03 (calldata shortened).
const QUOTE: SwapProQuote = {
  provider: "0x",
  sellChain: "BASE",
  buyChain: "BASE",
  sellToken: { caip: "eip155:8453/slip44:60", symbol: "ETH" },
  buyToken: { caip: `eip155:8453/erc20:${USDC}`, symbol: "USDC" },
  sellAmount: "0.1",
  buyAmount: "246.927321",
  minBuyAmount: "244.458047",
  rate: 2469.27321,
  tx: {
    chainId: 8453,
    to: "0x0000000000001ff3684f28c67538d4d072c22734",
    data: "0x2213bc0b000000000000000000000000",
    value: "0x16345785d8a0000",
    gasLimit: "0x2f8d0",
  },
  expiresAt: "2026-09-03T12:00:00.000Z",
  partner: "gnars",
  partnerFee: {
    requestedBps: 0,
    collectedBps: 0,
    collected: false,
    note: "No partner fee was requested.",
  },
};

describe("token mapping", () => {
  it("sends the native sentinel as the chain's native symbol and addresses as themselves", () => {
    expect(toSwapProToken(8453, NATIVE_SENTINEL)).toBe("ETH");
    expect(toSwapProToken(8453, NATIVE_SENTINEL.toUpperCase().replace("0X", "0x"))).toBe("ETH");
    expect(toSwapProToken(8453, USDC)).toBe(USDC);
    expect(toSwapProToken(10, USDC)).toBeNull();
  });
});

describe("quote URL", () => {
  it("converts base units to human decimals and carries the affiliate fee as partner + bps", () => {
    const url = buildQuoteUrl({
      chainId: 8453,
      sellToken: NATIVE_SENTINEL,
      buyToken: USDC,
      sellAmount: "100000000000000000",
      sellDecimals: 18,
      buyDecimals: 6,
      taker: TAKER,
      fee: { recipient: "0x1111111111111111111111111111111111111111", bps: 50 },
    });
    expect(url).toContain("sellChain=8453");
    expect(url).toContain("sellToken=ETH");
    expect(url).toContain(`buyToken=${USDC}`);
    expect(url).toContain("amount=0.1");
    expect(url).toContain(`address=${TAKER}`);
    expect(url).toContain("partner=0x1111111111111111111111111111111111111111");
    expect(url).toContain("partnerFeeBps=50");
  });

  it("names gnars as the partner without a fee, and refuses a chain SwapPro does not route", () => {
    const base = {
      sellToken: NATIVE_SENTINEL,
      buyToken: USDC,
      sellAmount: "1",
      sellDecimals: 18,
      buyDecimals: 6,
      taker: TAKER,
    };
    expect(buildQuoteUrl({ chainId: 8453, ...base })).toContain("partner=gnars");
    expect(buildQuoteUrl({ chainId: 8453, ...base })).not.toContain("partnerFeeBps");
    expect(buildQuoteUrl({ chainId: 10, ...base })).toBeNull();
  });
});

describe("widget shape", () => {
  it("returns base units, the enforced floor, the transaction, and the venue", () => {
    const w = toWidgetQuote(QUOTE, 18, 6);
    expect(w.liquidityAvailable).toBe(true);
    expect(w.sellAmount).toBe("100000000000000000");
    expect(w.buyAmount).toBe("246927321");
    expect(w.minBuyAmount).toBe("244458047");
    expect(w.transaction).toEqual({
      to: "0x0000000000001ff3684f28c67538d4d072c22734",
      data: "0x2213bc0b000000000000000000000000",
      value: "100000000000000000",
      gas: "194768",
    });
    expect(w.route).toBe("0x");
    expect(w.issues?.allowance).toBeNull();
  });

  it("surfaces an exact-amount approval as issues.allowance so the Approve button appears", () => {
    const w = toWidgetQuote(
      {
        ...QUOTE,
        approval: {
          chainId: 8453,
          token: USDC,
          spender: "0x0000000000001ff3684f28c67538d4d072c22734",
          amountWei: "100000000",
        },
      },
      6,
      18,
    );
    expect(w.issues?.allowance).toEqual({
      spender: "0x0000000000001ff3684f28c67538d4d072c22734",
      amount: "100000000",
    });
  });

  it("turns a SwapPro error into a no-liquidity answer with the reason", () => {
    const w = toWidgetError({ error: "No route for this pair at this size", code: "NO_ROUTE" });
    expect(w.liquidityAvailable).toBe(false);
    expect(w.reason).toContain("No route");
    expect(w.transaction).toBeUndefined();
  });
});
