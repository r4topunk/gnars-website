// One rich sponsorship graph, shared by every social-proof consumer on
// /stake/preview?demo=1 (SocialStats, StakeOrbit, BackerList).
//
// Why it exists: the live graph currently has ~5 backers spread thinly across the
// roster, so nothing on the preview exercises the layout the orbit was rewritten
// for — the proportional fan, its 34° cap, the radial stagger, or the label
// collision math in focus mode. A reviewer looking at five dots cannot say
// whether the dense case works. This fixture is the dense case.
//
// It is prototype-only. Production /stake never imports it; the components take
// the graph as an optional prop and fall back to `useStakeGraph()` when it is
// absent, so the live path is byte-identical to before.
//
// Shape rules it deliberately honours, so what a reviewer judges is the real
// component and not a special case:
//   - Real rider ids / vaults / splits from RIDER_LIST, so athlete nodes render
//     their actual portrait art and the ids match production translations.
//   - Uneven backer counts (6/5/4/4/3/3/2): every rider alive, a plausible decay
//     curve instead of one whale fan and an empty ring. Six backers still pins
//     the 34° fan cap (12° × 5 > 34°), so the dense case stays exercised. The
//     dimmed "nobody backs this rider yet" state is visible on live data
//     (?demo=0), which has four backerless riders.
//   - Wallets recur ACROSS riders. That cross-rider case is the entire reason the
//     orbit exists over the flat list, and it is invisible in the live data.
//   - Both venues and both Morpheus assets, so the per-node protocol logos and
//     the vault/MOR split of the total are both exercised.
//   - Every aggregate (`total`, `backerCount`, `gnarsAccrued`, `treasuryUsd`) is
//     REDUCED from the rows below, never typed as a constant. A hand-written
//     total drifts the moment a row is edited, and a reviewer who spots the drift
//     stops trusting every other number on the page.
import type { Address } from "viem";
import { RIDERS, type RiderId } from "@/lib/gnars-vaults";
import type { OrbitAthlete, OrbitBacker, StakeGraph } from "@/services/stake-graph";

/**
 * The cast. Addresses are fake but well-formed (40 lowercase hex), and each
 * carries its own `ens` — the orbit prefers that over the /api/ens lookup, which
 * would resolve nothing for invented wallets and leave the dense fan labelled
 * with twelve near-identical 0x-shorts.
 */
const WALLETS = {
  gnartard: {
    address: "0x7a3c9f21b64d8e05c1f4a7b2093de8615c4f10ab",
    ens: "gnartard.eth",
  },
  kickflip: {
    address: "0x2e91d47b0c8a35f61de29b74a503c8ef1b6d9420",
    ens: "kickflip.eth",
  },
  skatehive: {
    address: "0xb45f082ea19c76d3054fb8a29e17c60d3a8195ff",
    ens: "skatehive.eth",
  },
  downhillDan: {
    address: "0x14d8b6e05a72f39c8b410de6725fa9c03e17b8d2",
    ens: "downhill-dan.eth",
  },
  curbslappy: {
    address: "0x9f206ad7c3e5148b0629fd7a4c8e315d70b2a693",
    ens: "curbslappy.eth",
  },
  haxixe: {
    address: "0x6c78e3b5109fa24d83b0e517c6d94af208135e7c",
    ens: "haxixe.eth",
  },
  noseblunt: {
    address: "0xa03e57d19c8b642f05ae7136b9d48c02f57ea311",
    ens: "noseblunt.eth",
  },
  griptape: {
    address: "0x38b1f6c0d925ea74136b8fc502ad9e7b40163c85",
    ens: "griptape.eth",
  },
  bailsonly: {
    address: "0xd720c4f38b165ae09c7d24e1b0538fa6c9312d47",
    ens: "bailsonly.eth",
  },
  mongopush: {
    address: "0x51ae9c6b207d3f84016ceb59d4a7382f0b6d5c19",
    ens: "mongopush.eth",
  },
  shovit: {
    address: "0xe6410b8df29a53c07b1e64a5f8d3902c17ba4e60",
    ens: "shovit.eth",
  },
  waxthecurb: {
    address: "0x0b93a5e7126cf480d3a91b62e57c0d84f39a71b6",
    ens: "waxthecurb.eth",
  },
} as const satisfies Record<string, { address: Address; ens: string }>;

type WalletId = keyof typeof WALLETS;

/** A row as authored: who, how much, and where they staked. `asset` only exists
 *  on the Morpheus side, exactly like the live graph builds it. */
type Row = { w: WalletId; amount: number } & (
  | { kind: "vault" }
  | { kind: "mor"; asset: "steth" | "usdc" }
);

/**
 * The authored data. `fee` is the vault's accrued performance fee (the split's
 * shares), which is part of the vault's `totalAssets` and therefore part of the
 * rider's printed total — same relationship as on-chain, so the treasury figure
 * derived from it below is not invented.
 *
 * Amounts are deliberately ragged ($2.10 → $250.75, no repeats, no round
 * hundreds): a fixture full of 100/250/500 announces itself as a fixture and the
 * reviewer starts reading the layout as a mock instead of as the product.
 */
const AUTHORED: Record<RiderId, { fee: number; backers: Row[] }> = {
  // Densest fan of the set. Six backers already forces the 34° cap, so the
  // radial stagger is still what keeps the nodes — and, in focus mode, their
  // two-line labels — apart, without one rider's fan dwarfing the whole ring.
  vlad: {
    fee: 3.67,
    backers: [
      { w: "gnartard", amount: 122.4, kind: "vault" },
      { w: "kickflip", amount: 96.4, kind: "vault" },
      { w: "downhillDan", amount: 74.6, kind: "mor", asset: "steth" },
      { w: "haxixe", amount: 42.08, kind: "mor", asset: "usdc" },
      { w: "griptape", amount: 19.47, kind: "vault" },
      { w: "bailsonly", amount: 11.95, kind: "vault" },
    ],
  },
  yan: {
    fee: 1.12,
    backers: [
      { w: "kickflip", amount: 84.2, kind: "vault" },
      { w: "mongopush", amount: 45.3, kind: "vault" },
      { w: "shovit", amount: 36.88, kind: "vault" },
      { w: "gnartard", amount: 12.85, kind: "mor", asset: "usdc" },
      { w: "downhillDan", amount: 3.62, kind: "mor", asset: "steth" },
    ],
  },
  r4to: {
    fee: 0.62,
    backers: [
      { w: "haxixe", amount: 48.66, kind: "vault" },
      { w: "waxthecurb", amount: 39.75, kind: "vault" },
      { w: "gnartard", amount: 21.3, kind: "mor", asset: "steth" },
      { w: "skatehive", amount: 9.75, kind: "mor", asset: "usdc" },
    ],
  },
  pamtech: {
    fee: 0.31,
    backers: [
      { w: "mongopush", amount: 31.1, kind: "vault" },
      { w: "noseblunt", amount: 27.8, kind: "mor", asset: "steth" },
      { w: "curbslappy", amount: 14.62, kind: "vault" },
      { w: "gnartard", amount: 6.2, kind: "mor", asset: "steth" },
    ],
  },
  zima: {
    fee: 0.14,
    backers: [
      { w: "skatehive", amount: 24.3, kind: "vault" },
      { w: "kickflip", amount: 17.55, kind: "vault" },
      { w: "shovit", amount: 2.1, kind: "mor", asset: "usdc" },
    ],
  },
  v2: {
    fee: 0.19,
    backers: [
      { w: "curbslappy", amount: 23.85, kind: "vault" },
      { w: "skatehive", amount: 8.9, kind: "vault" },
      { w: "bailsonly", amount: 7.15, kind: "mor", asset: "usdc" },
    ],
  },
  will: {
    fee: 0.11,
    backers: [
      { w: "noseblunt", amount: 16.2, kind: "vault" },
      { w: "waxthecurb", amount: 4.85, kind: "mor", asset: "steth" },
    ],
  },
};

/** MOR/USD used only to value `gnarsMor` below, so the two agree. */
const DEMO_MOR_USD = 3.42;
/** Gnars' 25% cut of backer MOR rewards, distributed + in-split + still accruing. */
const DEMO_GNARS_MOR = 6.2841;

const toBacker = (row: Row): OrbitBacker => ({
  address: WALLETS[row.w].address,
  ens: WALLETS[row.w].ens,
  amount: row.amount,
  kind: row.kind,
  ...(row.kind === "mor" ? { asset: row.asset } : {}),
});

const athletes: OrbitAthlete[] = (Object.keys(AUTHORED) as RiderId[]).map((id) => {
  const rider = RIDERS[id];
  const spec = AUTHORED[id];
  // Descending, like the live builder sorts them — the fan's radial stagger is
  // assigned by index, so ordering is layout, not cosmetics.
  const backers = spec.backers.map(toBacker).sort((a, b) => b.amount - a.amount);
  // A rider's printed total is the VAULT's assets (Morpho principal + the fee
  // still sitting in the split). Morpheus stakes live on mainnet and are counted
  // once, at the graph level, exactly as `fetchStakeGraphUncached` does it.
  const vaultAssets = backers.reduce((s, b) => s + (b.kind === "vault" ? b.amount : 0), 0);
  return {
    id,
    handle: rider.handle,
    vault: rider.vault as Address,
    split: rider.split,
    total: vaultAssets > 0 ? vaultAssets + spec.fee : 0,
    feeAccrued: spec.fee,
    backers,
  };
});

const morTvl = athletes.reduce(
  (s, a) => s + a.backers.reduce((x, b) => x + (b.kind === "mor" ? b.amount : 0), 0),
  0,
);
const distinct = new Set(athletes.flatMap((a) => a.backers.map((b) => b.address.toLowerCase())));
// Gnars takes half of the vault performance fee; the athlete takes the other half.
const gnarsAccrued = athletes.reduce((s, a) => s + a.feeAccrued, 0) / 2;
const gnarsMorUsd = DEMO_GNARS_MOR * DEMO_MOR_USD;

export const DEMO_GRAPH: StakeGraph = {
  athletes,
  total: athletes.reduce((s, a) => s + a.total, 0) + morTvl,
  backerCount: distinct.size,
  gnarsAccrued,
  gnarsMor: DEMO_GNARS_MOR,
  gnarsMorUsd,
  treasuryUsd: gnarsAccrued + gnarsMorUsd,
};
