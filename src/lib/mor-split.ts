// Per-staker 3-way MOR reward split (staker 50% / Gnars 25% / athlete 25%).
//
// This mirrors the Morpho vault's sponsorship model for the Morpheus tier:
// instead of the athlete-only referrer bonus, a supporter points their MOR
// claim receiver at a deterministic 0xSplits PushSplit whose recipients are
// themselves, the Gnars Arbitrum multisig, and the athlete.
//
// Deterministic-lazy: the split's address is computed BEFORE it exists, so the
// staker can set it as their claim receiver on mainnet and MOR accrues at that
// Arbitrum address. The split contract is deployed lazily (createSplitDeterministic
// with the SAME params/owner/salt → SAME address, verified on-chain) and then
// `distribute` pushes each recipient's cut. Owner = address(0) → immutable, so
// nobody can rewrite a staker's split.

import {
  createPublicClient, http, fallback, getAddress, erc20Abi, formatUnits, type Address,
} from "viem";
import { arbitrum } from "viem/chains";
import { ARBITRUM_PUSH_SPLIT_FACTORY, MOR_TOKEN, MOR_DECIMALS, MOR_GNARS_RECIPIENT } from "@/lib/morpheus";

export const SPLIT_TOTAL_ALLOCATION = BigInt(1_000_000);
/** staker 50% / Gnars 25% / athlete 25% (of 1,000,000). */
export const SPLIT_ALLOC = {
  staker: BigInt(500_000),
  gnars: BigInt(250_000),
  athlete: BigInt(250_000),
} as const;

/** Immutable split, fixed salt — the params already differ per (staker, athlete). */
export const SPLIT_OWNER = getAddress("0x0000000000000000000000000000000000000000");
export const SPLIT_SALT = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export const arbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: fallback([
    http("https://arb1.arbitrum.io/rpc"),
    http("https://arbitrum.publicnode.com"),
    http("https://arbitrum-one.publicnode.com"),
  ]),
});

/** SplitV2Lib.Split — recipients, allocations, totalAllocation, distributionIncentive. */
export type SplitParams = {
  recipients: readonly Address[];
  allocations: readonly bigint[];
  totalAllocation: bigint;
  distributionIncentive: number;
};

const splitParamsTuple = {
  type: "tuple", name: "_splitParams", components: [
    { name: "recipients", type: "address[]" },
    { name: "allocations", type: "uint256[]" },
    { name: "totalAllocation", type: "uint256" },
    { name: "distributionIncentive", type: "uint16" },
  ],
} as const;

export const pushSplitFactoryAbi = [
  { type: "function", name: "createSplitDeterministic", stateMutability: "nonpayable",
    inputs: [splitParamsTuple, { name: "_owner", type: "address" }, { name: "_creator", type: "address" }, { name: "_salt", type: "bytes32" }],
    outputs: [{ name: "split", type: "address" }] },
  { type: "function", name: "predictDeterministicAddress", stateMutability: "view",
    inputs: [splitParamsTuple, { name: "_owner", type: "address" }, { name: "_salt", type: "bytes32" }],
    outputs: [{ type: "address" }] },
  { type: "function", name: "isDeployed", stateMutability: "view",
    inputs: [splitParamsTuple, { name: "_owner", type: "address" }, { name: "_salt", type: "bytes32" }],
    outputs: [{ name: "split", type: "address" }, { name: "exists", type: "bool" }] },
] as const;

/** distribute(Split, token, distributor) — pushes each recipient's balance of `token`. */
export const splitWalletAbi = [
  { type: "function", name: "distribute", stateMutability: "nonpayable",
    inputs: [splitParamsTuple, { name: "_token", type: "address" }, { name: "_distributor", type: "address" }],
    outputs: [] },
] as const;

/**
 * The split params for a (staker, athlete) pair. Recipient ORDER is fixed —
 * [staker, Gnars, athlete] — because the deterministic address depends on the
 * exact params encoding, so predict and deploy must pass them identically.
 */
export function splitParamsFor(staker: Address, athlete: Address): SplitParams {
  return {
    recipients: [getAddress(staker), MOR_GNARS_RECIPIENT, getAddress(athlete)],
    allocations: [SPLIT_ALLOC.staker, SPLIT_ALLOC.gnars, SPLIT_ALLOC.athlete],
    totalAllocation: SPLIT_TOTAL_ALLOCATION,
    distributionIncentive: 0,
  };
}

/** The deterministic Arbitrum address of a staker's 3-way split (exists or not). */
export async function predictSplitAddress(staker: Address, athlete: Address): Promise<Address> {
  return arbitrumClient.readContract({
    address: ARBITRUM_PUSH_SPLIT_FACTORY, abi: pushSplitFactoryAbi,
    functionName: "predictDeterministicAddress",
    args: [splitParamsFor(staker, athlete), SPLIT_OWNER, SPLIT_SALT],
  });
}

/** Whether a staker's 3-way split has been deployed yet. */
export async function isSplitDeployed(staker: Address, athlete: Address): Promise<boolean> {
  const [, exists] = await arbitrumClient.readContract({
    address: ARBITRUM_PUSH_SPLIT_FACTORY, abi: pushSplitFactoryAbi,
    functionName: "isDeployed",
    args: [splitParamsFor(staker, athlete), SPLIT_OWNER, SPLIT_SALT],
  });
  return exists;
}

/** MOR sitting at a staker's split on Arbitrum, waiting to be distributed. */
export async function splitMorBalance(staker: Address, athlete: Address): Promise<number> {
  try {
    const split = await predictSplitAddress(staker, athlete);
    const bal = await arbitrumClient.readContract({
      address: MOR_TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [split],
    });
    return Number(formatUnits(bal, MOR_DECIMALS));
  } catch {
    return 0;
  }
}
