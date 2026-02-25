import { decodeFunctionData, formatEther, formatUnits, isHex, type Address, type Hex } from "viem";
import { TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";

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

const ERC20_TRANSFER_SELECTOR = "0xa9059cbb";

export type ProposalFundingSource = {
  targets: string[];
  values: Array<string | number | bigint>;
  calldatas: string[];
};

export type ProposalFundingTotals = {
  totalEthWei: bigint;
  totalEth: number;
  totalUsdcRaw: bigint;
  totalUsdc: number;
};

function normalizeHex(data?: string): Hex | null {
  if (!data) return null;
  if (data === "0x") return "0x";
  const prefixed = data.startsWith("0x") ? data : `0x${data}`;
  return isHex(prefixed) ? (prefixed as Hex) : null;
}

function toBigInt(value: string | number | bigint | undefined): bigint {
  if (value == null) return 0n;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (value.startsWith("0x")) return BigInt(value as Hex);
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function decodeErc20TransferAmount(calldata: Hex): bigint {
  const { args } = decodeFunctionData({ abi: ERC20_TRANSFER_ABI, data: calldata });
  const [, amount] = args as [Address, bigint];
  return amount;
}

export function getProposalFundingTotals(source: ProposalFundingSource): ProposalFundingTotals {
  let totalEthWei = 0n;
  let totalUsdcRaw = 0n;
  const usdcAddress = TREASURY_TOKEN_ALLOWLIST.USDC.toLowerCase();

  for (let i = 0; i < source.targets.length; i += 1) {
    const target = String(source.targets[i] ?? "").toLowerCase();
    const valueWei = toBigInt(source.values[i]);
    if (valueWei > 0n) totalEthWei += valueWei;

    if (target !== usdcAddress) continue;

    const calldata = normalizeHex(source.calldatas[i]);
    if (!calldata || calldata === "0x") continue;
    if (calldata.slice(0, 10).toLowerCase() !== ERC20_TRANSFER_SELECTOR) continue;

    try {
      const amount = decodeErc20TransferAmount(calldata);
      if (amount > 0n) totalUsdcRaw += amount;
    } catch {
      // Ignore malformed calldata for card-level aggregates.
    }
  }

  return {
    totalEthWei,
    totalEth: Number(formatEther(totalEthWei)),
    totalUsdcRaw,
    totalUsdc: Number(formatUnits(totalUsdcRaw, 6)),
  };
}

export function getProposalRequestedUsdTotal(totals: ProposalFundingTotals, ethPriceUsd: number): number {
  const safeEthPrice = Number.isFinite(ethPriceUsd) && ethPriceUsd > 0 ? ethPriceUsd : 0;
  return totals.totalUsdc + totals.totalEth * safeEthPrice;
}
