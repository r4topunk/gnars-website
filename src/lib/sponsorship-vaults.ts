// Gnars sponsorship vaults — shared spec.
//
// One Morpho V2 vault per athlete: USDC deposits route 100% into Moonwell
// Flagship USDC (Moonwell curates the risk), a 50% performance fee is taken and
// sent to a 0xSplits PullSplit shared 50/50 between the Gnars DAO treasury and
// the athlete's wallet. Net on the yield: depositor 50% / Gnars 25% / athlete
// 25% — matching the /stake REWARD_SPLIT {you:50, skater:25, treasury:25}.
//
// Every on-chain value here (maxRate, liquidityData, fee, caps, idData formula,
// the submit()+call timelock-0 pattern) was read from the LIVE, working SOPA
// vault 0x3A36…bCbD8 — the same recipe, not guessed. See the portal's
// scripts/deploy-sponsorship-vault.cjs for the CLI equivalent / provenance.

import {
  getAddress, encodeAbiParameters, encodeFunctionData,
  type Address, type Hex,
} from "viem";

export const CHAIN_ID = 8453;

// The SOPA Safe owns/curates every vault (SOPA runs treasury ops for Gnars).
// Its owners include the athletes themselves (vlad, r4to, louzoshi, vaipraonde),
// so proposals are signed by a real owner in the browser — no server key.
export const SOPA_SAFE = getAddress("0x96C37393B79aD7EABdF9Ccf82C2EDAd3d3c0eEA2");
export const GNARS_TREASURY = getAddress("0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88"); // Nouns Builder timelock
export const USDC = getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
export const MOONWELL_USDC = getAddress("0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca");

export const VAULT_V2_FACTORY = getAddress("0x4501125508079A99ebBebCE205DeC9593C2b5857");
export const ADAPTER_FACTORY = getAddress("0xF42D9c36b34c9c2CF3Bc30eD2a52a90eEB604642");
export const PULL_SPLIT_FACTORY = getAddress("0x6B9118074aB15142d7524E8c4ea8f62A3Bdb98f1"); // 0xSplits SplitV2
export const MULTISEND_CALL_ONLY = getAddress("0x9641d764fc13c8B624c04430C7356C1C7C8102e2"); // 1.4.1
export const SAFE_TX_SERVICE = "https://safe-transaction-base.safe.global";

// copied verbatim from the live SOPA vault
export const PERFORMANCE_FEE = 500000000000000000n; // 0.5e18 = 50%
export const MAX_RATE = 6341958396n;                // ≈ 20% APR cap (per-second WAD)
export const LIQUIDITY_DATA: Hex = "0x";            // Moonwell adapter takes empty data
export const ABSOLUTE_CAP = (1n << 128n) - 1n;      // type(uint128).max
export const RELATIVE_CAP = 1000000000000000000n;   // 1e18 = 100%
export const SPLIT_TOTAL = 1000000n;                // 0xSplits PERCENTAGE_SCALE (1e6)

// Reward split shown on /stake, and the on-chain shares it maps to.
export const REWARD_SPLIT = { you: 50, skater: 25, treasury: 25 } as const;

// ---- ABIs -----------------------------------------------------------------
export const vaultFactoryAbi = [{
  type: "function", name: "createVaultV2", stateMutability: "nonpayable",
  inputs: [{ name: "owner", type: "address" }, { name: "asset", type: "address" }, { name: "salt", type: "bytes32" }],
  outputs: [{ type: "address" }],
}, {
  // On-chain signature: owner/asset/newVaultV2 are all indexed.
  type: "event", name: "CreateVaultV2", inputs: [
    { name: "owner", type: "address", indexed: true },
    { name: "asset", type: "address", indexed: true },
    { name: "salt", type: "bytes32", indexed: false },
    { name: "newVaultV2", type: "address", indexed: true },
  ],
}] as const;

export const adapterFactoryAbi = [{
  type: "function", name: "createMorphoVaultV1Adapter", stateMutability: "nonpayable",
  inputs: [{ name: "parentVault", type: "address" }, { name: "morphoVaultV1", type: "address" }],
  outputs: [{ type: "address" }],
}, {
  // On-chain signature: all three addresses are indexed.
  type: "event", name: "CreateMorphoVaultV1Adapter", inputs: [
    { name: "parentVault", type: "address", indexed: true },
    { name: "morphoVaultV1", type: "address", indexed: true },
    { name: "morphoVaultV1Adapter", type: "address", indexed: true },
  ],
}] as const;

const splitParamsTuple = {
  type: "tuple", name: "_split", components: [
    { name: "recipients", type: "address[]" },
    { name: "allocations", type: "uint256[]" },
    { name: "totalAllocation", type: "uint256" },
    { name: "distributionIncentive", type: "uint16" },
  ],
} as const;
export const splitFactoryAbi = [{
  type: "function", name: "createSplit", stateMutability: "nonpayable",
  inputs: [splitParamsTuple, { name: "_owner", type: "address" }, { name: "_creator", type: "address" }],
  outputs: [{ type: "address" }],
}, {
  // SplitFactoryV2 announces the new proxy address here. On-chain signature
  // carries a trailing `nonce` — omitting it makes topic0 mismatch and the log
  // won't decode.
  type: "event", name: "SplitCreated", inputs: [
    { name: "split", type: "address", indexed: true },
    splitParamsTuple,
    { name: "owner", type: "address", indexed: false },
    { name: "creator", type: "address", indexed: false },
    { name: "nonce", type: "uint256", indexed: false },
  ],
}] as const;

export const vaultAbi = [
  { type: "function", name: "submit", stateMutability: "nonpayable", inputs: [{ type: "bytes" }], outputs: [] },
  { type: "function", name: "setCurator", stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [] },
  { type: "function", name: "setName", stateMutability: "nonpayable", inputs: [{ type: "string" }], outputs: [] },
  { type: "function", name: "setSymbol", stateMutability: "nonpayable", inputs: [{ type: "string" }], outputs: [] },
  { type: "function", name: "setIsAllocator", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "bool" }], outputs: [] },
  { type: "function", name: "addAdapter", stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [] },
  { type: "function", name: "increaseAbsoluteCap", stateMutability: "nonpayable", inputs: [{ type: "bytes" }, { type: "uint256" }], outputs: [] },
  { type: "function", name: "increaseRelativeCap", stateMutability: "nonpayable", inputs: [{ type: "bytes" }, { type: "uint256" }], outputs: [] },
  { type: "function", name: "setLiquidityAdapterAndData", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "bytes" }], outputs: [] },
  { type: "function", name: "setMaxRate", stateMutability: "nonpayable", inputs: [{ type: "uint256" }], outputs: [] },
  { type: "function", name: "setPerformanceFee", stateMutability: "nonpayable", inputs: [{ type: "uint256" }], outputs: [] },
  { type: "function", name: "setPerformanceFeeRecipient", stateMutability: "nonpayable", inputs: [{ type: "address" }], outputs: [] },
  { type: "function", name: "performanceFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint96" }] },
  { type: "function", name: "performanceFeeRecipient", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "maxRate", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "liquidityAdapter", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "isAdapter", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "convertToAssets", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

export type SafeCall = { to: Address; data: Hex; value?: bigint };

/**
 * idData for a "this"-adapter cap: the RAW abi.encode("this", adapter).
 * The vault hashes it internally (`id = keccak256(idData)`), so hashing here
 * too would set the cap under a meaningless id and leave the adapter uncapped.
 */
export function idData(adapter: Address): Hex {
  return encodeAbiParameters([{ type: "string" }, { type: "address" }], ["this", getAddress(adapter)]);
}

const enc = (fn: string, args: readonly unknown[]): Hex =>
  encodeFunctionData({ abi: vaultAbi, functionName: fn as never, args: args as never });

const submitThenCall = (vault: Address, data: Hex): SafeCall[] => [
  { to: vault, data: enc("submit", [data]) },
  { to: vault, data },
];

/**
 * The full config MultiSend for a freshly-deployed vault, proposed to the SOPA
 * Safe. Curator actions are submit()+call (timelocks are 0); the two allocator
 * actions run direct, right after the Safe is made an allocator. Ordering
 * matters: adapter + caps must exist before setLiquidityAdapter.
 */
/** ERC-20 identity for a rider's vault, so it isn't nameless in wallets and explorers. */
export function vaultNaming(riderId: string) {
  const label = riderId.charAt(0).toUpperCase() + riderId.slice(1);
  return { name: `Gnars ${label} USDC`, symbol: `gn${riderId.toUpperCase()}` };
}

export function buildConfigCalls(
  vault: Address,
  adapter: Address,
  split: Address,
  riderId?: string,
): SafeCall[] {
  const id = idData(adapter);
  const naming = riderId ? vaultNaming(riderId) : null;
  return [
    // Name it up front — an unnamed vault shows as a blank ERC-20 in wallets and
    // explorers, and block indexers skip its holders entirely. Owner-gated, no
    // timelock.
    ...(naming
      ? [
          { to: vault, data: enc("setName", [naming.name]) },
          { to: vault, data: enc("setSymbol", [naming.symbol]) },
        ]
      : []),
    // createVaultV2 only sets the OWNER; every call below is curator-gated, so
    // the Safe has to make itself curator first (owner-only, no timelock) or
    // the whole batch reverts.
    { to: vault, data: enc("setCurator", [SOPA_SAFE]) },
    ...submitThenCall(vault, enc("setIsAllocator", [SOPA_SAFE, true])),
    ...submitThenCall(vault, enc("addAdapter", [adapter])),
    ...submitThenCall(vault, enc("increaseAbsoluteCap", [id, ABSOLUTE_CAP])),
    ...submitThenCall(vault, enc("increaseRelativeCap", [id, RELATIVE_CAP])),
    { to: vault, data: enc("setLiquidityAdapterAndData", [adapter, LIQUIDITY_DATA]) }, // allocator, direct
    { to: vault, data: enc("setMaxRate", [MAX_RATE]) },                                // allocator, direct
    // Recipient BEFORE fee: setPerformanceFee reverts while the recipient is
    // still address(0) (FeeInvariantBroken).
    ...submitThenCall(vault, enc("setPerformanceFeeRecipient", [split])),
    ...submitThenCall(vault, enc("setPerformanceFee", [PERFORMANCE_FEE])),
  ];
}

/** The 0xSplits params for an athlete: Gnars treasury 50% / athlete 50%. */
export function splitParamsFor(athlete: Address) {
  return {
    recipients: [GNARS_TREASURY, getAddress(athlete)] as Address[],
    allocations: [SPLIT_TOTAL / 2n, SPLIT_TOTAL / 2n] as bigint[],
    totalAllocation: SPLIT_TOTAL,
    distributionIncentive: 0,
  };
}

/** Pack calls into MultiSend `transactions` bytes: operation(00)+to+value+len+data. */
export function encodeMultiSend(calls: SafeCall[]): Hex {
  const parts = calls.map((c) => {
    const to = getAddress(c.to).slice(2).toLowerCase();
    const value = (c.value ?? 0n).toString(16).padStart(64, "0");
    const data = (c.data || "0x").slice(2);
    const len = (data.length / 2).toString(16).padStart(64, "0");
    return `00${to}${value}${len}${data}`;
  });
  return `0x${parts.join("")}` as Hex;
}

export const SAFE_TX_TYPES = {
  SafeTx: [
    { name: "to", type: "address" }, { name: "value", type: "uint256" }, { name: "data", type: "bytes" },
    { name: "operation", type: "uint8" }, { name: "safeTxGas", type: "uint256" }, { name: "baseGas", type: "uint256" },
    { name: "gasPrice", type: "uint256" }, { name: "gasToken", type: "address" }, { name: "refundReceiver", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

/** Next Safe nonce = max(on-chain, highest queued + 1), to avoid collisions. */
export async function nextSafeNonce(safe: Address): Promise<number> {
  let onchain = 0, queued = -1;
  try {
    const r = await fetch(`${SAFE_TX_SERVICE}/api/v1/safes/${safe}/`);
    const j = await r.json();
    onchain = Number(j.nonce ?? 0) || 0;
  } catch { /* ignore */ }
  try {
    const r = await fetch(`${SAFE_TX_SERVICE}/api/v1/safes/${safe}/multisig-transactions/?ordering=-nonce&limit=1`);
    const j = await r.json();
    if (j.results?.[0]?.nonce != null) queued = Number(j.results[0].nonce);
  } catch { /* ignore */ }
  return Math.max(onchain, queued + 1);
}

export const safeQueueUrl = (safe: Address) => `https://app.safe.global/transactions/queue?safe=base:${safe}`;
