// What the treasury HOLDS in protocol positions — stock, not flow.
//
// The /treasury page's inflow ledger answers "what arrived"; this module
// answers "what the DAO owns by right that is not a wallet balance". Shared
// spec across the Gnars / SkateHive / SOPA surfaces:
//
//   1. Net worth by RIGHT, not token-in-wallet: a protocol position is an asset.
//   2. Every position value is read from the protocol's own on-chain state.
//   3. NEVER double-count: a position's underlying must not also appear as a
//      wallet balance (nothing here overlaps TREASURY_TOKEN_ADDRESSES).
//   4. Liquidity is part of the value: each position says how it exits.
//   5. UNKNOWN IS NOT ZERO: a failed read surfaces as `ok: false`, never as 0.
//      A legitimate zero (empty vault) is `ok: true, usd: 0` — different fact.
//
// REUSE, not a second truth: the treasury's share of vault-fee shares parked in
// the rider splits is ALREADY computed by the stake graph (`gnarsAccrued`, the
// same number the Sponsorship card prints). This module reads everything the
// graph does NOT: shares already in the treasury, warehouse balances, the
// non-vault splits' undistributed balances, and the Builders-subnet stake.

import { cache } from "react";
import { createPublicClient, fallback, formatEther, formatUnits, http, parseAbi } from "viem";
import { base } from "viem/chains";
import { DAO_ADDRESSES, TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";
import { RIDER_LIST } from "@/lib/gnars-vaults";
import {
  BASE_RPCS,
  BUILDERS,
  buildersAbi,
  GNARS_SUBNET_ID,
  MOR_BASE,
} from "@/lib/morpheus-builder";
import { getEthUsd, getTokenPriceUsd } from "@/services/prices";
import { loadStakeGraph } from "@/services/stake-graph";
import {
  DROPOSAL_7CAPAS_SPLIT,
  DROPOSAL_UGANDA_SPLIT,
  SUBNET_FINAL_SPLIT,
  SWAP_FEE_SPLIT,
} from "@/services/treasury-inflows";

const TREASURY = DAO_ADDRESSES.treasury as `0x${string}`;
const WAREHOUSE = "0x8fb66f38cf86a3d5e8768f8f1754a24a6c661fb8" as const;
const USDC = TREASURY_TOKEN_ALLOWLIST.USDC as `0x${string}`;

/** The non-vault splits and the treasury's verified share of each (address book). */
const SPLIT_SHARES: Array<{ split: `0x${string}`; pct: number; labelKey: string }> = [
  { split: SUBNET_FINAL_SPLIT as `0x${string}`, pct: 0.2, labelKey: "splitSubnet" },
  { split: SWAP_FEE_SPLIT as `0x${string}`, pct: 0.5, labelKey: "splitSwap" },
  { split: DROPOSAL_UGANDA_SPLIT as `0x${string}`, pct: 0.8, labelKey: "splitDropUganda" },
  { split: DROPOSAL_7CAPAS_SPLIT as `0x${string}`, pct: 0.495, labelKey: "splitDrop7capas" },
];

/** How a position exits — rendered next to its value (spec rule 4). */
export type DefiLiquidity =
  | { kind: "instant" } // permissionless pull (warehouse withdraw / split distribute)
  | { kind: "proposal" } // needs a governance proposal (ERC-4626 redeem by the timelock)
  | { kind: "locked"; unlockAt: number }; // timed lock, unix seconds

export type DefiPosition = {
  /** i18n key under treasury.defi.positions */
  labelKey: string;
  liquidity: DefiLiquidity;
} & (
  | { ok: true; usd: number; /** token amount when USD is not the native unit */ amount?: string }
  | { ok: false }
);

export interface TreasuryDefi {
  positions: DefiPosition[];
  /** Sum of the KNOWN positions. */
  knownUsd: number;
  /** True when every read succeeded — the only state where knownUsd is the whole truth. */
  complete: boolean;
}

/** Pure: fold positions into the summary the KPI consumes. Exported for tests. */
export function summarizeDefi(positions: DefiPosition[]): TreasuryDefi {
  let knownUsd = 0;
  let complete = true;
  for (const p of positions) {
    if (p.ok) knownUsd += p.usd;
    else complete = false;
  }
  return { positions, knownUsd, complete };
}

const erc4626Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
]);
const erc20Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const warehouseAbi = parseAbi([
  "function balanceOf(address owner, uint256 id) view returns (uint256)",
]);

function client() {
  return createPublicClient({
    chain: base,
    transport: fallback(BASE_RPCS.map((u) => http(u, { timeout: 20_000 }))),
  });
}

/**
 * Every read is wrapped individually: one RPC hiccup marks ITS position
 * `ok: false` and leaves the rest standing (spec rule 5 — a failure must
 * surface as a failure, and must not take the whole card down with it).
 */
export const loadTreasuryDefi = cache(async (): Promise<TreasuryDefi> => {
  const pc = client();
  const positions: DefiPosition[] = [];

  // (a) ERC-4626 rider-vault shares HELD BY the treasury. convertToAssets of
  // the treasury's OWN share balance — never the vault's totalAssets, which is
  // everyone's money and would inflate the number by the whole TVL.
  const vaults = RIDER_LIST.filter((r) => r.vault);
  const vaultReads = await Promise.all(
    vaults.map(async (r) => {
      try {
        const shares = await pc.readContract({
          address: r.vault as `0x${string}`,
          abi: erc4626Abi,
          functionName: "balanceOf",
          args: [TREASURY],
        });
        const assets =
          shares > 0n
            ? await pc.readContract({
                address: r.vault as `0x${string}`,
                abi: erc4626Abi,
                functionName: "convertToAssets",
                args: [shares],
              })
            : 0n;
        return { ok: true as const, usd: Number(formatUnits(assets, 6)) };
      } catch {
        return { ok: false as const };
      }
    }),
  );
  {
    const okReads = vaultReads.filter((v) => v.ok);
    const usd = okReads.reduce((s, v) => s + (v.ok ? v.usd : 0), 0);
    positions.push(
      okReads.length === vaultReads.length
        ? { labelKey: "vaultShares", liquidity: { kind: "proposal" }, ok: true, usd }
        : { labelKey: "vaultShares", liquidity: { kind: "proposal" }, ok: false },
    );
  }

  // (b) The treasury's half of the vault-fee shares still parked in the rider
  // splits — REUSED from the stake graph (`gnarsAccrued`), the same figure the
  // Sponsorship card prints. Reading it again here would be a second truth.
  try {
    const { graph, degraded } = await loadStakeGraph();
    positions.push(
      degraded
        ? { labelKey: "feeInSplits", liquidity: { kind: "instant" }, ok: false }
        : {
            labelKey: "feeInSplits",
            liquidity: { kind: "instant" },
            ok: true,
            usd: graph.gnarsAccrued,
          },
    );
  } catch {
    positions.push({ labelKey: "feeInSplits", liquidity: { kind: "instant" }, ok: false });
  }

  // (c1) The treasury's own SplitsWarehouse balances (withdrawable by anyone,
  // permissionlessly). USDC in USD terms; ETH/WETH valued at the ETH price.
  try {
    const [usdcBal, wethBal, ethBal, ethUsd] = await Promise.all([
      pc.readContract({
        address: WAREHOUSE,
        abi: warehouseAbi,
        functionName: "balanceOf",
        args: [TREASURY, BigInt(USDC)],
      }),
      pc.readContract({
        address: WAREHOUSE,
        abi: warehouseAbi,
        functionName: "balanceOf",
        args: [TREASURY, BigInt(TREASURY_TOKEN_ALLOWLIST.WETH)],
      }),
      pc.readContract({
        address: WAREHOUSE,
        abi: warehouseAbi,
        functionName: "balanceOf",
        args: [TREASURY, BigInt("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE")],
      }),
      getEthUsd(),
    ]);
    const ethish = Number(formatEther(wethBal)) + Number(formatEther(ethBal));
    if (ethish > 0 && ethUsd == null) {
      positions.push({ labelKey: "warehouse", liquidity: { kind: "instant" }, ok: false });
    } else {
      const usd = Number(formatUnits(usdcBal, 6)) + ethish * (ethUsd ?? 0);
      positions.push({ labelKey: "warehouse", liquidity: { kind: "instant" }, ok: true, usd });
    }
  } catch {
    positions.push({ labelKey: "warehouse", liquidity: { kind: "instant" }, ok: false });
  }

  // (c2) Undistributed balances sitting in the non-vault splits — the
  // treasury's verified percentage of each (the rest belongs to the other
  // recipients and is deliberately NOT counted).
  const ethUsdForSplits = await getEthUsd();
  const splitReads = await Promise.all(
    SPLIT_SHARES.map(async ({ split, pct, labelKey }) => {
      try {
        const [usdcBal, ethBal] = await Promise.all([
          pc.readContract({
            address: USDC,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [split],
          }),
          pc.getBalance({ address: split }),
        ]);
        const eth = Number(formatEther(ethBal));
        if (eth > 0 && ethUsdForSplits == null) return { labelKey, ok: false as const };
        const usd = (Number(formatUnits(usdcBal, 6)) + eth * (ethUsdForSplits ?? 0)) * pct;
        return { labelKey, ok: true as const, usd };
      } catch {
        return { labelKey, ok: false as const };
      }
    }),
  );
  {
    const anyFailed = splitReads.some((s) => !s.ok);
    const usd = splitReads.reduce((s, r) => s + (r.ok ? r.usd : 0), 0);
    positions.push(
      anyFailed
        ? { labelKey: "splitPending", liquidity: { kind: "instant" }, ok: false }
        : { labelKey: "splitPending", liquidity: { kind: "instant" }, ok: true, usd },
    );
  }

  // (d) MOR staked into the Gnars Builders subnet by treasury-controlled
  // addresses (the timelock itself + the interim migration multisig). Value
  // in USD only when MOR is priceable; a real stake with no price surfaces
  // the amount and fails the USD read rather than claiming $0 (rule 5).
  try {
    const stakers: Array<[string, `0x${string}`]> = [
      ["treasury", TREASURY],
      ["multisig", "0xBe6C3D651d2F6e9eFA562b5a7CDf411304cad076"],
    ];
    let mor = 0;
    let lastDeposit = 0;
    for (const [, addr] of stakers) {
      const d = await pc.readContract({
        address: BUILDERS,
        abi: buildersAbi,
        functionName: "usersData",
        args: [addr, GNARS_SUBNET_ID],
      });
      mor += Number(formatUnits(d[2], 18));
      lastDeposit = Math.max(lastDeposit, Number(d[0]));
    }
    // 7-day withdraw lock counts from the LAST deposit (per BuildersV4).
    const unlockAt = lastDeposit + 604_800;
    const lock: DefiLiquidity =
      mor > 0 && unlockAt * 1000 > Date.now() ? { kind: "locked", unlockAt } : { kind: "instant" };
    if (mor === 0) {
      positions.push({ labelKey: "subnetStake", liquidity: { kind: "instant" }, ok: true, usd: 0 });
    } else {
      const morPrice = await getTokenPriceUsd(MOR_BASE.toLowerCase(), "base");
      if (morPrice == null) {
        positions.push({
          labelKey: "subnetStake",
          liquidity: lock,
          ok: false,
        });
      } else {
        positions.push({
          labelKey: "subnetStake",
          liquidity: lock,
          ok: true,
          usd: mor * morPrice,
          amount: `${mor.toLocaleString("en-US", { maximumFractionDigits: 2 })} MOR`,
        });
      }
    }
  } catch {
    positions.push({ labelKey: "subnetStake", liquidity: { kind: "instant" }, ok: false });
  }

  return summarizeDefi(positions);
});
