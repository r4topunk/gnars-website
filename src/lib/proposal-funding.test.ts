import { encodeFunctionData, parseEther } from "viem";
import { describe, expect, it } from "vitest";
import { TREASURY_TOKEN_ALLOWLIST } from "./config";
import { getProposalFundingTotals, getProposalRequestedUsdTotal } from "./proposal-funding";

const USDC_BASE = TREASURY_TOKEN_ALLOWLIST.USDC;
const USDC_ETH_MAINNET = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const SOME_CONTRACT = "0x1234567890123456789012345678901234567890";
const RECIPIENT = "0x000000000000000000000000000000000000dEaD" as const;

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function encodeUsdcTransfer(to: `0x${string}`, amount: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [to, amount],
  });
}

describe("getProposalFundingTotals", () => {
  it("returns zeros for an empty proposal", () => {
    const totals = getProposalFundingTotals({
      targets: [],
      values: [],
      calldatas: [],
    });

    expect(totals.totalEthWei).toBe(0n);
    expect(totals.totalEth).toBe(0);
    expect(totals.totalUsdcRaw).toBe(0n);
    expect(totals.totalUsdc).toBe(0);
  });

  it("sums raw ETH transfers across multiple transactions", () => {
    const totals = getProposalFundingTotals({
      targets: [RECIPIENT, RECIPIENT],
      values: [parseEther("1"), parseEther("2.5")],
      calldatas: ["0x", "0x"],
    });

    expect(totals.totalEthWei).toBe(parseEther("3.5"));
    expect(totals.totalEth).toBeCloseTo(3.5, 10);
  });

  it("accepts numeric string, number, and bigint value inputs", () => {
    const totals = getProposalFundingTotals({
      targets: [RECIPIENT, RECIPIENT, RECIPIENT],
      values: ["1000000000000000000", 2, 3n],
      calldatas: ["0x", "0x", "0x"],
    });

    // 1e18 wei (string) + 2 wei (number) + 3 wei (bigint)
    expect(totals.totalEthWei).toBe(parseEther("1") + 5n);
  });

  it("accepts hex-encoded value strings", () => {
    const totals = getProposalFundingTotals({
      targets: [RECIPIENT],
      values: ["0xde0b6b3a7640000"], // 1 ETH
      calldatas: ["0x"],
    });

    expect(totals.totalEthWei).toBe(parseEther("1"));
  });

  it("decodes USDC transfers on Base into totalUsdc with 6 decimals", () => {
    const calldata = encodeUsdcTransfer(RECIPIENT, 100_000_000n); // 100 USDC

    const totals = getProposalFundingTotals({
      targets: [USDC_BASE],
      values: [0n],
      calldatas: [calldata],
    });

    expect(totals.totalUsdcRaw).toBe(100_000_000n);
    expect(totals.totalUsdc).toBeCloseTo(100, 10);
  });

  it("decodes USDC transfers on Ethereum mainnet too (legacy subgraph)", () => {
    const calldata = encodeUsdcTransfer(RECIPIENT, 42_000_000n); // 42 USDC

    const totals = getProposalFundingTotals({
      targets: [USDC_ETH_MAINNET],
      values: [0n],
      calldatas: [calldata],
    });

    expect(totals.totalUsdcRaw).toBe(42_000_000n);
    expect(totals.totalUsdc).toBeCloseTo(42, 10);
  });

  it("matches USDC target regardless of address casing", () => {
    const calldata = encodeUsdcTransfer(RECIPIENT, 10_000_000n);

    const totals = getProposalFundingTotals({
      targets: [USDC_BASE.toUpperCase()],
      values: [0n],
      calldatas: [calldata],
    });

    expect(totals.totalUsdcRaw).toBe(10_000_000n);
  });

  it("reconstructs calldatas that are missing the transfer selector (Nouns subgraph shape)", () => {
    // Normal ABI-encoded transfer(to, amount), minus the 4-byte selector.
    // First 32 bytes = recipient (left-padded), next 32 bytes = amount.
    const recipientPadded = RECIPIENT.slice(2).toLowerCase().padStart(64, "0");
    const amountPadded = 50_000_000n.toString(16).padStart(64, "0");
    const selectorless = `0x${recipientPadded}${amountPadded}` as const;

    const totals = getProposalFundingTotals({
      targets: [USDC_BASE],
      values: [0n],
      calldatas: [selectorless],
    });

    expect(totals.totalUsdcRaw).toBe(50_000_000n);
  });

  it("ignores non-USDC ERC20 transfers", () => {
    const calldata = encodeUsdcTransfer(RECIPIENT, 999_000_000n);

    const totals = getProposalFundingTotals({
      targets: [SOME_CONTRACT],
      values: [0n],
      calldatas: [calldata],
    });

    expect(totals.totalUsdcRaw).toBe(0n);
  });

  it("ignores calldata that does not start with the transfer selector", () => {
    const totals = getProposalFundingTotals({
      targets: [USDC_BASE],
      values: [0n],
      calldatas: ["0xdeadbeef00000000000000000000000000000000"],
    });

    expect(totals.totalUsdcRaw).toBe(0n);
  });

  it("does not throw on malformed calldata; treats it as zero USDC", () => {
    const totals = getProposalFundingTotals({
      targets: [USDC_BASE],
      values: [0n],
      calldatas: ["0xa9059cbbdeadbeef"], // selector is right but args are truncated
    });

    expect(totals.totalUsdcRaw).toBe(0n);
  });

  it("handles mixed ETH + USDC in a single proposal", () => {
    const usdcCalldata = encodeUsdcTransfer(RECIPIENT, 25_000_000n);

    const totals = getProposalFundingTotals({
      targets: [RECIPIENT, USDC_BASE, RECIPIENT],
      values: [parseEther("0.5"), 0n, parseEther("1")],
      calldatas: ["0x", usdcCalldata, "0x"],
    });

    expect(totals.totalEthWei).toBe(parseEther("1.5"));
    expect(totals.totalUsdcRaw).toBe(25_000_000n);
    expect(totals.totalUsdc).toBeCloseTo(25, 10);
  });
});

describe("getProposalRequestedUsdTotal", () => {
  const base = {
    totalEthWei: parseEther("2"),
    totalEth: 2,
    totalUsdcRaw: 100_000_000n,
    totalUsdc: 100,
  };

  it("sums USDC plus ETH converted at the given price", () => {
    expect(getProposalRequestedUsdTotal(base, 3000)).toBeCloseTo(6100, 6);
  });

  it("treats a non-positive ETH price as zero ETH contribution", () => {
    expect(getProposalRequestedUsdTotal(base, 0)).toBe(100);
    expect(getProposalRequestedUsdTotal(base, -500)).toBe(100);
  });

  it("treats a non-finite ETH price as zero ETH contribution", () => {
    expect(getProposalRequestedUsdTotal(base, Number.NaN)).toBe(100);
    expect(getProposalRequestedUsdTotal(base, Number.POSITIVE_INFINITY)).toBe(100);
  });
});
