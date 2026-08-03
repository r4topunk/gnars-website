// Morpheus Builders subnet staking — the "back Gnars on Morpheus" flow.
//
// Distinct from the Capital pools in `morpheus.ts` (stake stETH/USDC on mainnet
// to earn MOR). Here a supporter LOCKS **MOR** directly into the Gnars Builder
// subnet on **Base**. The subnet accrues MOR emissions for the builder; the
// staker's principal is theirs, withdrawable after a 7-day lock. All values
// below were read on-chain from BuildersV4 before hardcoding.

import { createPublicClient, fallback, formatUnits, getAddress, http, type Address } from "viem";
import { base } from "viem/chains";

/** BuildersV4 (ERC1967 proxy) on Base. */
export const BUILDERS = getAddress("0x42BB446eAE6dca7723a9eBdb81EA88aFe77eF4B9");

/** The Gnars Builder subnet id (bytes32, NOT an address). */
export const GNARS_SUBNET_ID = "0xf129111951997d1c386be9b7de27d4c74490c42ad0ffbcb65e380d17f8a8ea3d" as const;

/** MOR on Base — the deposit token (verified = depositToken()). */
export const MOR_BASE = getAddress("0x7431aDa8a591C955a994a21710752EF9b882b8e3");
export const MOR_DECIMALS = 18;

/** subnets(id).withdrawLockPeriodAfterDeposit — 7 days (read on-chain). */
export const SUBNET_WITHDRAW_LOCK_SECONDS = 604800;
/** subnets(id).minimalDeposit — 0.001 MOR (read on-chain). */
export const SUBNET_MIN_DEPOSIT_MOR = "0.001";

// Only the members this UI needs. Types verified against the on-chain ABI.
export const buildersAbi = [
  { type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [
    { name: "subnetId_", type: "bytes32" }, { name: "amount_", type: "uint256" },
  ], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [
    { name: "subnetId_", type: "bytes32" }, { name: "amount_", type: "uint256" },
  ], outputs: [] },
  { type: "function", name: "usersData", stateMutability: "view", inputs: [
    { name: "user", type: "address" }, { name: "subnetId", type: "bytes32" },
  ], outputs: [
    { name: "lastDeposit", type: "uint128" }, { name: "_1", type: "uint128" },
    { name: "deposited", type: "uint256" }, { name: "_2", type: "uint256" },
  ] },
  { type: "function", name: "subnetsData", stateMutability: "view", inputs: [{ name: "subnetId", type: "bytes32" }], outputs: [
    { name: "_0", type: "uint128" }, { name: "deposited", type: "uint256" },
    { name: "_2", type: "uint256" }, { name: "rate", type: "uint256" }, { name: "pendingRewards", type: "uint256" },
  ] },
  { type: "function", name: "getCurrentSubnetRewards", stateMutability: "view", inputs: [{ name: "subnetId", type: "bytes32" }], outputs: [{ type: "uint256" }] },
] as const;

export const erc20AbiMin = [
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

/** Public Base RPCs, healthy-first (mainnet.base.org rate-limits under bursts). */
export const BASE_RPCS: readonly string[] = [
  "https://base-rpc.publicnode.com",
  "https://base.drpc.org",
  "https://mainnet.base.org",
];

export type GnarsSubnetPosition = {
  /** Staked MOR principal. */
  staked: number;
  /** Unix seconds when withdraw unlocks (0 if nothing staked). */
  unlockAt: number;
  /** MOR balance in the wallet, available to stake. */
  walletMor: number;
};

export const GNARS_SUBNET = { id: GNARS_SUBNET_ID, admin: getAddress("0x8Bf5941d27176242745B716251943Ae4892a3C26") } as const;

/**
 * Total MOR staked into the Gnars subnet, read on-chain (server-safe).
 * Mirrors the `useGnarsSubnet` hook: `subnetsData(id).deposited`, 18 decimals.
 * Used to gate the homepage "Powered by Morpheus" reveal behind the goal.
 */
export async function getGnarsSubnetTotalStaked(): Promise<number> {
  const client = createPublicClient({ chain: base, transport: fallback(BASE_RPCS.map((u) => http(u))) });
  const data = await client.readContract({
    address: BUILDERS,
    abi: buildersAbi,
    functionName: "subnetsData",
    args: [GNARS_SUBNET_ID],
  });
  return Number(formatUnits(data[1], MOR_DECIMALS));
}

export type { Address };
