// The whole sponsorship graph — every rider vault's total and who backs it —
// computed SERVER-SIDE and cached, so the orbit loads instantly (shared across
// users) instead of doing dozens of client RPC round-trips on every mount.
//
// Smart tricks vs. the old client hook:
//  - Multicall3: all of a vault's reads (totalAssets/totalSupply/every balance)
//    go in ONE aggregated call instead of 2 round-trips per backer.
//  - Shares → assets is computed locally from totalAssets/totalSupply, killing
//    the per-backer convertToAssets calls entirely.
//  - MOR log scans and usersData reads are parallelized + multicalled.
//  - The whole result goes through `unstable_cache` under the `stake` tag
//    (caching-standard.md Rule 2): the TTL is a backstop, freshness comes from
//    `revalidateTag("stake")` fired by the deposit/withdraw/claim hooks. That
//    keeps this — the single heaviest server-side operation in the repo — off
//    the request path, so a cache miss at the CDN layer costs a data-cache read
//    instead of the full ~3.5s recompute.
//
//    Scope matters: `unstable_cache` writes to Next's data cache, which is what
//    `revalidateTag` invalidates. It is NOT the CDN — a response already cached
//    by the `Cache-Control` header on /api/stake-graph is not tag-aware and
//    ages out on its own. See that route for how the two windows are split.

import { unstable_cache } from "next/cache";
import {
  createPublicClient,
  erc20Abi,
  fallback,
  formatUnits,
  getAddress,
  http,
  keccak256,
  toHex,
  type Address,
} from "viem";
import { base, mainnet } from "viem/chains";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { RIDER_LIST, type RiderId } from "@/lib/gnars-vaults";
import { arbitrumClient, splitMorBalance } from "@/lib/mor-split";
import {
  depositPoolAbi,
  MOR_DECIMALS,
  MOR_GNARS_RECIPIENT,
  MOR_REWARD_POOL_INDEX,
  MOR_TOKEN,
  MORPHEUS_POOLS,
} from "@/lib/morpheus";
import { getEthUsd, getTokenPriceUsd, type UsdPrice } from "@/services/prices";

// Prefer Alchemy (reliable, handles large getLogs) when the key is set, since
// the public RPCs frequently fail/timeout on the MOR log scan — and a swallowed
// failure there means a staker silently vanishes from the orbit.
const ALCHEMY = process.env.ALCHEMY_API_KEY;
// eth.drpc.org leads for the mainnet reads: it serves the referrer-filtered
// eth_getLogs query reliably in ~0.2s with NO block-range cap. Alchemy's FREE
// tier limits eth_getLogs to a 10-block range (useless for our scan), and the
// other free RPCs (publicnode/llama) reject or rate-limit getLogs — a swallowed
// failure there silently emptied the MOR scan and dropped stakers from the
// orbit. Alchemy is kept as a (paid-tier) fallback; public nodes last.
const ethRpcs = [
  "https://eth.drpc.org",
  ...(ALCHEMY ? [`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY}`] : []),
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com",
];
const baseRpcs = [
  ...(ALCHEMY ? [`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY}`] : []),
  "https://mainnet.base.org",
  "https://base-rpc.publicnode.com",
  "https://base.drpc.org",
];

const baseClient = createPublicClient({
  chain: base,
  batch: { multicall: true },
  transport: fallback(baseRpcs.map((u) => http(u))),
});
const ethClient = createPublicClient({
  chain: mainnet,
  batch: { multicall: true },
  transport: fallback(ethRpcs.map((u) => http(u))),
});

const userReferredEvent = {
  type: "event",
  name: "UserReferred",
  inputs: [
    { name: "rewardPoolIndex", type: "uint256", indexed: true },
    { name: "user", type: "address", indexed: true },
    { name: "referrer", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
  ],
} as const;

const vaultAbi = [
  {
    type: "function",
    name: "totalAssets",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export type OrbitBacker = {
  address: Address;
  amount: number;
  /** "vault" = Morpho USDC sponsorship vault (Base); "mor" = Morpheus stake (mainnet). */
  kind: "vault" | "mor";
  asset?: "steth" | "usdc";
  /**
   * A label the graph already knows, used INSTEAD of the client-side /api/ens
   * lookup. Nothing in this module ever sets it — the live path still resolves
   * names in the browser. It exists for fixture graphs, whose invented
   * addresses resolve to nothing: without it a dense fan renders
   * as a dozen indistinguishable 0x-shorts, and the lookup is a wasted request.
   */
  ens?: string;
};
export type OrbitAthlete = {
  id: RiderId;
  handle: string;
  vault: Address;
  split?: Address;
  total: number;
  feeAccrued: number;
  backers: OrbitBacker[];
};
export type StakeGraph = {
  athletes: OrbitAthlete[];
  total: number;
  backerCount: number;
  /**
   * Whether every rider's VAULT (Morpho) backer list is known to be complete.
   *
   * The distinction this encodes did not exist before: an orbit with no backers
   * meant either "nobody has staked" or "the indexer we ask about holders was
   * down", and the code could not tell you which. Anything rendering backers
   * must check this before drawing a conclusion from an empty list — and must
   * not present a partial list as the full picture.
   *
   * SCOPE, deliberately narrow: this covers the vault half only. The MOR half
   * (`morBackersByRider`) still returns an empty list on a failed log scan
   * without saying so, so a `true` here does NOT promise the Morpheus stakers
   * are all present. Widening it means teaching that path to tell a real outage
   * apart from an absent ETHERSCAN_API_KEY, which is its own change.
   */
  backersResolved: boolean;
  /** Gnars' share of the Morpho vault performance fee accrued so far, in USD. */
  gnarsAccrued: number;
  /** MOR earned for the Gnars treasury (distributed + its 25% still in splits). */
  gnarsMor: number;
  /** That MOR valued in USD. */
  gnarsMorUsd: number;
  /** Total earned for the treasury in USD = vault fee + MOR value. */
  treasuryUsd: number;
};

/**
 * Carries the partial graph out of `unstable_cache` on the degraded path — see
 * `loadStakeGraph`. The marker field is what gets checked, not `instanceof`,
 * which does not survive every module/bundle boundary.
 */
class StakeGraphDegradedError extends Error {
  readonly degradedGraph: StakeGraph;
  readonly isStakeGraphDegraded = true as const;
  constructor(graph: StakeGraph) {
    super("stake-graph: backer discovery incomplete");
    this.name = "StakeGraphDegradedError";
    this.degradedGraph = graph;
  }
}

const ZERO = "0x0000000000000000000000000000000000000000";

/**
 * WHO HOLDS A VAULT'S SHARES — and what to do when nobody will tell us.
 *
 * There is no "list the holders" call on an ERC-20, so holders can only be
 * recovered from transfer history, which means an indexer. Blockscout was the
 * only one, and it is not reliable enough to be alone: fanning the seven vaults
 * out in parallel (what production does) returned HTTP 500 for 2 of 15 calls
 * from a single laptop, and its `/holders` endpoint reports zero for a vault
 * that on-chain has five holders covering 100% of supply.
 *
 * Two things changed here. There is a second source, and — the part that
 * actually matters — **a failure is now reported instead of flattened into an
 * empty list**. "Nobody backs this rider" and "we could not find out who backs
 * this rider" are different facts about the world, and the `catch {}` that used
 * to live here turned the second into the first, silently, for a whole cache
 * TTL. The orbit then rendered a rider with real deposits as having no backers.
 *
 * Why NOT raw `eth_getLogs` on our own RPC as the second source, which is the
 * obvious idea: measured, every Base endpoint in `baseRpcs` caps the range at
 * 10,000 blocks (mainnet.base.org and drpc say so in the error; Alchemy's free
 * tier allows TEN, and publicnode wants a paid token for archive range at all).
 * The vaults' history is already ~1.08M blocks wide — ~109 chunked calls per
 * vault per cache miss, growing with the chain forever. Alchemy's transfer
 * index answers the same question in one paged call, on the key this module
 * already holds, so it is the same "infra we control" without the fan-out.
 */
type Discovery = Address[] | null;

/** Add a hex address to the set, skipping the zero address and anything malformed. */
function collect(out: Set<Address>, raw: string | null | undefined): void {
  if (!raw || raw.toLowerCase() === ZERO) return;
  try {
    out.add(getAddress(raw));
  } catch {
    /* not an address */
  }
}

/** `null` = the source failed. An empty array = the source answered "none". */
async function fromBlockscout(vault: Address): Promise<Discovery> {
  try {
    const res = await fetch(`https://base.blockscout.com/api/v2/tokens/${vault}/transfers`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      items?: { to?: { hash?: string }; from?: { hash?: string } }[];
    };
    // A 200 whose body isn't the shape we expect is a failure, not "no holders".
    if (!Array.isArray(json.items)) return null;
    const out = new Set<Address>();
    for (const t of json.items) {
      collect(out, t.to?.hash);
      collect(out, t.from?.hash);
    }
    return [...out];
  } catch {
    return null;
  }
}

/**
 * Alchemy's transfer index, paged to the end. Blockscout's `/transfers` serves
 * one page of recent history, so it can answer with a genuine-looking subset of
 * holders once a vault outlives its first page — this one walks `pageKey` to
 * the end instead. The 10-page stop is a runaway guard, not an expected bound.
 */
async function fromAlchemy(vault: Address): Promise<Discovery> {
  if (!ALCHEMY) return null;
  const out = new Set<Address>();
  let pageKey: string | undefined;
  try {
    for (let page = 0; page < 10; page++) {
      const res = await fetch(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_getAssetTransfers",
          params: [
            {
              fromBlock: "0x0",
              toBlock: "latest",
              contractAddresses: [vault],
              category: ["erc20"],
              maxCount: "0x3e8",
              ...(pageKey ? { pageKey } : {}),
            },
          ],
        }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return null;
      const j = (await res.json()) as {
        error?: unknown;
        result?: { transfers?: { from?: string; to?: string }[]; pageKey?: string };
      };
      if (j.error || !Array.isArray(j.result?.transfers)) return null;
      for (const t of j.result.transfers) {
        collect(out, t.from);
        collect(out, t.to);
      }
      pageKey = j.result.pageKey;
      if (!pageKey) break;
    }
    return [...out];
  } catch {
    return null;
  }
}

/** Tried in order. Blockscout stays first so a healthy day behaves exactly as before. */
const HOLDER_SOURCES: Array<(vault: Address) => Promise<Discovery>> = [fromBlockscout, fromAlchemy];

/**
 * Value a stETH position in USD, or throw.
 *
 * The graph used to be built from `tokens * ethUsd` with `ethUsd` silently 0 on
 * any price hiccup. Every stETH row then evaluated to $0 and was dropped by the
 * `usd > 0` filter — erasing most of the TVL and several backers while still
 * returning a perfectly well-formed `StakeGraph`. Nothing threw, so the route's
 * error path never ran and the bad graph was cached like a good one.
 *
 * Throwing is what makes the caching safe: it reaches the route's `catch`,
 * which answers 500 with `no-store`, so a pricing outage degrades to "no data"
 * instead of "confidently wrong data pinned for the backstop TTL".
 */
function priceStEth(tokens: number, ethUsd: UsdPrice): number {
  if (ethUsd == null) {
    throw new Error("stake-graph: ETH/USD unavailable — refusing to price stETH positions at $0");
  }
  return tokens * ethUsd;
}

// Etherscan V2 logs API — a hosted indexer that answers from datacenter IPs,
// which the free RPCs block for eth_getLogs (that silently emptied this scan in
// prod). One unified key covers every chain (chainid=1 here).
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Must be a MAINNET-capable key from etherscan.io. The repo's BASESCAN_API_KEY
// is Basescan-only → chainid=1 returns "NOTOK / invalid api key", so it's NOT a
// usable fallback here; set ETHERSCAN_API_KEY explicitly in the env.
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY;
const USER_REFERRED_SIG = keccak256(toHex("UserReferred(uint256,address,address,uint256)"));
const pad32 = (a: Address) => `0x000000000000000000000000${a.slice(2).toLowerCase()}`;

/** A rider's referred stakes on a pool, straight from the UserReferred events.
 * Needs a mainnet-capable Etherscan key (a Basescan-only key returns NOTOK for
 * chainid=1) — set ETHERSCAN_API_KEY in the env. */
async function etherscanReferred(
  pool: Address,
  referrer: Address,
  key: string,
): Promise<Array<{ user: Address; amount: bigint }>> {
  const url =
    `https://api.etherscan.io/v2/api?chainid=1&module=logs&action=getLogs&address=${pool}` +
    `&topic0=${USER_REFERRED_SIG}&topic0_3_opr=and&topic3=${pad32(referrer)}` +
    `&fromBlock=0&toBlock=latest&page=1&offset=1000&apikey=${key}`;
  for (let i = 0; i < 4; i++) {
    try {
      // Deliberately uncached at the fetch layer. Etherscan signals rate limits
      // with HTTP 200 + an error body, so a TTL'd fetch would happily cache a
      // "rate limit reached" response and poison the graph for the whole TTL.
      // Caching happens one level up, in the `unstable_cache` wrapper around
      // `getStakeGraph` — this callback only runs on a cache miss, and its
      // `no-store` is scoped to that callback, so it can't opt the calling
      // route out of caching the way a bare request-scoped `no-store` would.
      const res = await fetch(url, { cache: "no-store" });
      const j = (await res.json()) as { status?: string; message?: string; result?: unknown };
      if (j.status === "1" && Array.isArray(j.result)) {
        return (j.result as Array<{ topics: string[]; data: string }>).map((l) => ({
          user: getAddress(`0x${l.topics[2].slice(26)}`),
          amount: BigInt(l.data),
        }));
      }
      // The rate-limit note lives in `result` ("Max calls per sec rate limit
      // reached (3/sec)"), not `message` — retry with backoff before giving up.
      if (/rate limit/i.test(String(j.message)) || /rate limit/i.test(String(j.result))) {
        await sleep(600);
        continue;
      }
      return []; // "No records found" / bad key
    } catch {
      await sleep(300);
    }
  }
  return [];
}

// The MOR claim receiver a staker set for a pool (0x0 if never set). The /stake
// flow wires this to the rider's 3-way split, so a NON-zero receiver marks an
// "official" sponsorship stake (its MOR routes to Gnars + the athlete). A zero
// receiver is a raw Morpheus deposit that pays 100% back to the staker — not a
// sponsorship, so the orbit must not count it. Read via Etherscan proxy eth_call
// (datacenter-safe, same key as the log scan).
const CLAIM_RECEIVER_SIG = keccak256(toHex("claimReceiver(uint256,address)")).slice(0, 10);
async function etherscanClaimReceiver(
  pool: Address,
  user: Address,
  key: string,
): Promise<Address | null> {
  const data = `${CLAIM_RECEIVER_SIG}${"0".repeat(64)}${pad32(user).slice(2)}`;
  const url =
    `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_call` +
    `&to=${pool}&data=${data}&tag=latest&apikey=${key}`;
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const j = (await res.json()) as { result?: unknown; message?: string };
      if (typeof j.result === "string" && j.result.length >= 66)
        return getAddress(`0x${j.result.slice(-40)}`);
      if (/rate limit/i.test(String(j.result)) || /rate limit/i.test(String(j.message))) {
        await sleep(600);
        continue;
      }
      return null;
    } catch {
      await sleep(300);
    }
  }
  return null;
}

// A staker's currently-claimable MOR on a pool (still in the Morpheus contract,
// pre-claim). Gnars' 25% of this is revenue ACCRUING to the treasury — it shows
// up here so the treasury figure ticks up like the (also-unrealized) vault fee,
// instead of sitting at 0 until the first claim→split→distribute. Etherscan
// proxy eth_call (datacenter-safe); returns wei, 0 on any failure.
const LATEST_REWARD_SIG = keccak256(toHex("getLatestUserReward(uint256,address)")).slice(0, 10);
async function etherscanLatestReward(pool: Address, user: Address, key: string): Promise<bigint> {
  const data = `${LATEST_REWARD_SIG}${"0".repeat(64)}${pad32(user).slice(2)}`;
  const url =
    `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_call` +
    `&to=${pool}&data=${data}&tag=latest&apikey=${key}`;
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const j = (await res.json()) as { result?: unknown; message?: string };
      if (typeof j.result === "string" && /^0x[0-9a-fA-F]+$/.test(j.result)) {
        try {
          return BigInt(j.result);
        } catch {
          return BigInt(0);
        }
      }
      if (/rate limit/i.test(String(j.result)) || /rate limit/i.test(String(j.message))) {
        await sleep(600);
        continue;
      }
      return BigInt(0);
    } catch {
      await sleep(300);
    }
  }
  return BigInt(0);
}

async function morBackersByRider(ethUsd: UsdPrice): Promise<Record<string, OrbitBacker[]>> {
  const walletToId = new Map<string, RiderId>();
  for (const r of RIDER_LIST) if (r.wallet) walletToId.set(r.wallet.toLowerCase(), r.id);
  const referrers = [...walletToId.keys()].map((a) => getAddress(a));
  const byRider: Record<string, OrbitBacker[]> = {};
  if (referrers.length === 0) return byRider;

  // Primary: Etherscan hosted logs (datacenter-safe). One call per (pool, rider),
  // all in parallel; the staked amount comes straight from the event.
  if (ETHERSCAN_KEY) {
    const idWallets = RIDER_LIST.filter((r) => r.wallet).map(
      (r) => [r.id, r.wallet as Address] as const,
    );
    const escPools: Array<{ asset: "steth" | "usdc"; pool: Address; decimals: number }> = [
      { asset: "steth", pool: MORPHEUS_POOLS.stEth.pool, decimals: 18 },
      { asset: "usdc", pool: MORPHEUS_POOLS.usdc.pool, decimals: 6 },
    ];
    const pairs = escPools.flatMap((p) => idWallets.map(([id, ref]) => ({ ...p, id, ref })));
    const rows: Array<{ id: RiderId; backer: OrbitBacker }>[] = [];
    // The key's tier caps at ~3 req/s — run the calls in waves of 3 with a gap
    // so they don't get rate-limited into empty results (the retry backoff
    // covers the rest). The route caches the whole graph for 60s.
    const BATCH = 3;
    for (let i = 0; i < pairs.length; i += BATCH) {
      const wave = await Promise.all(
        pairs.slice(i, i + BATCH).map(async ({ asset, pool, decimals, id, ref }) => {
          const logs = await etherscanReferred(pool, ref, ETHERSCAN_KEY as string);
          // Staked amount straight from the events (no eth_call). Withdrawals
          // aren't subtracted, but the 7-day lock makes that rare.
          const byUser = new Map<string, bigint>();
          for (const l of logs)
            byUser.set(
              l.user.toLowerCase(),
              (byUser.get(l.user.toLowerCase()) ?? BigInt(0)) + l.amount,
            );
          const out: Array<{ id: RiderId; backer: OrbitBacker }> = [];
          for (const [userLc, amt] of byUser) {
            const user = getAddress(userLc);
            // Only OFFICIAL /stake deposits belong in the sponsorship orbit: the
            // site wires the MOR claim receiver to the rider's 3-way split. A zero
            // receiver is a raw Morpheus stake whose MOR pays 100% to the staker
            // (no Gnars/athlete cut) — exclude it from the orbit AND the total.
            const receiver = await etherscanClaimReceiver(pool, user, ETHERSCAN_KEY as string);
            if (!receiver || receiver.toLowerCase() === ZERO) continue;
            const tokens = Number(formatUnits(amt, decimals));
            const usd = asset === "steth" ? priceStEth(tokens, ethUsd) : tokens;
            if (usd > 0)
              out.push({
                id,
                backer: { address: user, amount: usd, kind: "mor", asset },
              });
          }
          return out;
        }),
      );
      rows.push(...wave);
      if (i + BATCH < pairs.length) await sleep(320);
    }
    for (const { id, backer } of rows.flat()) (byRider[id] ||= []).push(backer);
    return byRider;
  }

  // Fallback (no Etherscan key, e.g. local dev): viem getLogs + usersData.
  let latest: bigint;
  try {
    latest = await ethClient.getBlockNumber();
  } catch {
    return byRider;
  }
  // ~3-week window, chunked at 10k so both Alchemy and the public fallback RPCs
  // accept each range (public nodes reject large getLogs spans).
  const WINDOW = BigInt(150_000);
  const CHUNK = BigInt(10_000);
  const from0 = latest > WINDOW ? latest - WINDOW : BigInt(0);

  const pools: Array<{ asset: "steth" | "usdc"; pool: Address; decimals: number }> = [
    { asset: "steth", pool: MORPHEUS_POOLS.stEth.pool, decimals: 18 },
    { asset: "usdc", pool: MORPHEUS_POOLS.usdc.pool, decimals: 6 },
  ];

  const perPool = await Promise.all(
    pools.map(async ({ asset, pool, decimals }) => {
      // Parallelize the chunked log scan.
      const ranges: Array<[bigint, bigint]> = [];
      for (let s = from0; s <= latest; s += CHUNK + BigInt(1)) {
        ranges.push([s, s + CHUNK > latest ? latest : s + CHUNK]);
      }
      const logsArr = await Promise.all(
        ranges.map(([fromBlock, toBlock]) =>
          ethClient
            .getLogs({
              address: pool,
              event: userReferredEvent,
              args: { rewardPoolIndex: MOR_REWARD_POOL_INDEX, referrer: referrers },
              fromBlock,
              toBlock,
            })
            .catch(() => []),
        ),
      );
      const userToRef = new Map<string, string>();
      for (const l of logsArr.flat()) {
        const user = l.args.user as Address | undefined;
        const ref = l.args.referrer as Address | undefined;
        if (user && ref) userToRef.set(user.toLowerCase(), ref.toLowerCase());
      }
      const users = [...userToRef.keys()];
      if (users.length === 0) return [] as Array<{ id: RiderId; backer: OrbitBacker }>;

      // One multicall for every referred user's position.
      const uds = await ethClient.multicall({
        allowFailure: true,
        contracts: users.map((u) => ({
          address: pool,
          abi: depositPoolAbi,
          functionName: "usersData",
          args: [getAddress(u), MOR_REWARD_POOL_INDEX],
        })),
      });

      const rows: Array<{ id: RiderId; backer: OrbitBacker }> = [];
      users.forEach((u, i) => {
        const id = walletToId.get(userToRef.get(u)!);
        if (!id) return;
        const ud = uds[i].result as unknown as readonly bigint[] | undefined;
        const deposited = ud?.[1] ?? BigInt(0);
        if (deposited <= BigInt(0)) return;
        const tokens = Number(formatUnits(deposited, decimals));
        const amount = asset === "steth" ? priceStEth(tokens, ethUsd) : tokens;
        if (amount <= 0) return;
        rows.push({ id, backer: { address: getAddress(u), amount, kind: "mor", asset } });
      });
      return rows;
    }),
  );

  for (const { id, backer } of perPool.flat()) (byRider[id] ||= []).push(backer);
  return byRider;
}

/**
 * MOR earned/accruing for the Gnars treasury, in three tiers (Gnars = 25% of the
 * staker's rewards throughout):
 *   1. directRaw   — already distributed to the Gnars Arbitrum multisig.
 *   2. in-split    — claimed to a staker's split, awaiting distribution (Arbitrum).
 *   3. accruing    — still unclaimed in the Morpheus pools (mainnet, pending).
 * Tier 3 keeps the figure alive: it ticks up as MOR accrues, mirroring the
 * (also-unrealized) vault fee, instead of reading 0 until the first claim.
 * Best-effort — priced in USD via CoinGecko.
 */
async function gnarsMorEarned(
  morByRider: Record<string, OrbitBacker[]>,
): Promise<{ mor: number; usd: number }> {
  // The pricing check deliberately lives OUTSIDE the try below: that catch is
  // there to tolerate flaky Arbitrum reads, and it would happily swallow a
  // "cannot price" throw, putting us right back to reporting $0 for real MOR.
  const { mor, morUsd } = await readGnarsMor(morByRider);
  // Same rule as `priceStEth`: only a balance we actually hold and cannot price
  // is a failure. With no MOR accrued there is nothing to misreport.
  if (mor > 0 && morUsd == null) {
    throw new Error("stake-graph: MOR/USD unavailable — refusing to value accrued MOR at $0");
  }
  return { mor, usd: mor * (morUsd ?? 0) };
}

/** Raw read, tolerant of flaky RPCs. Pricing policy is applied by the caller. */
async function readGnarsMor(
  morByRider: Record<string, OrbitBacker[]>,
): Promise<{ mor: number; morUsd: UsdPrice }> {
  const walletById = new Map<string, Address>();
  for (const r of RIDER_LIST) if (r.wallet) walletById.set(r.id, r.wallet);

  // Unique (staker, athlete) pairs → the per-staker splits holding MOR.
  const pairs = new Map<string, [Address, Address]>();
  // (pool, staker) targets for the still-unclaimed MOR accruing in Morpheus.
  const pendTargets: Array<[Address, Address]> = [];
  for (const [id, backers] of Object.entries(morByRider)) {
    const ref = walletById.get(id);
    if (!ref) continue;
    for (const b of backers) {
      pairs.set(`${b.address}-${ref}`.toLowerCase(), [b.address, ref]);
      if (b.kind === "mor" && b.asset && ETHERSCAN_KEY) {
        const pool = b.asset === "steth" ? MORPHEUS_POOLS.stEth.pool : MORPHEUS_POOLS.usdc.pool;
        pendTargets.push([pool, b.address]);
      }
    }
  }

  try {
    const [splitBals, directRaw, morUsd, pendRaw] = await Promise.all([
      Promise.all([...pairs.values()].map(([s, a]) => splitMorBalance(s, a).catch(() => 0))),
      arbitrumClient
        .readContract({
          address: MOR_TOKEN,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [MOR_GNARS_RECIPIENT],
        })
        .then((b) => Number(formatUnits(b, MOR_DECIMALS)))
        .catch(() => 0),
      getTokenPriceUsd(MOR_TOKEN, "arbitrum-one"),
      Promise.all(
        pendTargets.map(([p, u]) =>
          etherscanLatestReward(p, u, ETHERSCAN_KEY as string).catch(() => BigInt(0)),
        ),
      ),
    ]);
    const inSplitGnars = splitBals.reduce((s, v) => s + v, 0) * 0.25; // claimed, awaiting distribute
    const accruingGnars =
      pendRaw.reduce((s, v) => s + Number(formatUnits(v, MOR_DECIMALS)), 0) * 0.25; // still in Morpheus
    const mor = inSplitGnars + directRaw + accruingGnars;
    return { mor, morUsd };
  } catch {
    return { mor: 0, morUsd: null as UsdPrice };
  }
}

/**
 * Backstop TTL for the DATA cache only — deliberately not the CDN window, which
 * /api/stake-graph sets separately and much shorter (the CDN entry can't be
 * tag-invalidated, so it, not this, bounds cross-user staleness).
 *
 * Staking is a low-frequency event (a handful of deposits a day at most), so
 * what refreshes this is `revalidateTag("stake")` from the deposit/withdraw/
 * claim hooks, not the TTL expiring. The previous 60s put the repo's heaviest
 * server-side computation on a ~1440×/day treadmill for data that changes a few
 * times a day.
 *
 * Not exported: nothing outside this module should couple its own window to it.
 */
const GRAPH_TTL_SECONDS = 1800;

async function fetchStakeGraphUncached(): Promise<StakeGraph> {
  const live = RIDER_LIST.filter((r) => r.vault);
  if (live.length === 0)
    return {
      athletes: [],
      total: 0,
      backerCount: 0,
      // No live vaults means there was nothing to look up, not a lookup that failed.
      backersResolved: true,
      gnarsAccrued: 0,
      gnarsMor: 0,
      gnarsMorUsd: 0,
      treasuryUsd: 0,
    };

  const ethUsd = await getEthUsd();
  const [athleteRows, mor] = await Promise.all([
    Promise.all(
      live.map(async (r): Promise<{ athlete: OrbitAthlete; complete: boolean }> => {
        const vault = r.vault as Address;
        const splitAddr = r.split ? getAddress(r.split) : undefined;

        // Vault-level truth first, in one call. It is also the cheapest possible
        // answer to "could anyone hold shares here?" — a vault with zero supply
        // needs NO indexer round-trip at all, which is four of the seven riders
        // today, and those four can never be degraded by an indexer outage.
        const head = await baseClient.multicall({
          allowFailure: true,
          contracts: [
            { address: vault, abi: vaultAbi, functionName: "totalAssets", args: [] },
            { address: vault, abi: vaultAbi, functionName: "totalSupply", args: [] },
          ] as Parameters<typeof baseClient.multicall>[0]["contracts"],
        });

        // `allowFailure` lets a genuinely empty vault (success, 0n) and a dead
        // RPC (failure, no result) both arrive here. Coercing the second to 0n
        // is what turns an outage into a plausible "nobody has staked" graph —
        // the exact shape of bug that gets cached and believed. Distinguish
        // them by `status` and let a real failure reach the route's catch.
        if (head[0].status === "failure" || head[1].status === "failure") {
          throw new Error(`stake-graph: vault reads failed for ${vault}`);
        }
        const totalAssets = (head[0].result as bigint | undefined) ?? BigInt(0);
        const totalSupply = (head[1].result as bigint | undefined) ?? BigInt(0);
        const toAssets = (shares: bigint) =>
          totalSupply > BigInt(0) ? (shares * totalAssets) / totalSupply : BigInt(0);

        let backers: OrbitBacker[] = [];
        let feeShares = BigInt(0);
        // No supply means no holders. That is a FACT about the vault, not a
        // lookup that came back empty — so it is complete by construction.
        let complete = totalSupply === BigInt(0);

        if (!complete) {
          for (const source of HOLDER_SOURCES) {
            const found = await source(vault);
            if (!found) continue; // this source is down — ask the next one
            const candidates = splitAddr ? found.filter((a) => a !== splitAddr) : found;

            const res = await baseClient.multicall({
              allowFailure: true,
              contracts: [
                ...candidates.map((a) => ({
                  address: vault,
                  abi: vaultAbi,
                  functionName: "balanceOf",
                  args: [a],
                })),
                ...(splitAddr
                  ? [
                      {
                        address: vault,
                        abi: vaultAbi,
                        functionName: "balanceOf",
                        args: [splitAddr],
                      },
                    ]
                  : []),
              ] as Parameters<typeof baseClient.multicall>[0]["contracts"],
            });

            const rows: OrbitBacker[] = [];
            let accounted = BigInt(0);
            candidates.forEach((addr, i) => {
              const shares = (res[i].result as bigint | undefined) ?? BigInt(0);
              if (shares <= BigInt(0)) return;
              accounted += shares;
              rows.push({
                address: addr,
                amount: Number(formatUnits(toAssets(shares), 6)),
                kind: "vault",
              });
            });
            const split = splitAddr
              ? ((res[candidates.length].result as bigint | undefined) ?? BigInt(0))
              : BigInt(0);
            accounted += split;

            // Did we account for the WHOLE vault? Holders are only discoverable
            // through transfer history, so a source that serves one page of that
            // history looks exactly like a vault with fewer backers. Summing the
            // shares we DID find against totalSupply is the one check that tells
            // the two apart — on a healthy vault they match to the wei.
            if (accounted >= totalSupply) {
              backers = rows;
              feeShares = split;
              complete = true;
              break;
            }
            // Partial answer: keep the fullest one seen, but let the next source
            // try to beat it. Showing some real backers beats showing none — it
            // just must not be labelled complete.
            if (rows.length > backers.length) {
              backers = rows;
              feeShares = split;
            }
          }
        }

        backers.sort((a, b) => b.amount - a.amount);

        return {
          athlete: {
            id: r.id,
            handle: r.handle,
            vault,
            split: r.split,
            total: Number(formatUnits(totalAssets, 6)),
            feeAccrued: Number(formatUnits(toAssets(feeShares), 6)),
            backers,
          },
          complete,
        };
      }),
    ),
    morBackersByRider(ethUsd),
  ]);

  const athletes = athleteRows.map((x) => x.athlete);
  const backersResolved = athleteRows.every((x) => x.complete);

  for (const a of athletes) {
    const m = mor[a.id];
    if (m && m.length) {
      a.backers.push(...m);
      a.backers.sort((x, y) => y.amount - x.amount);
    }
  }

  const distinct = new Set<string>();
  athletes.forEach((a) => a.backers.forEach((b) => distinct.add(b.address.toLowerCase())));

  const gnarsAccrued = athletes.reduce((s, a) => s + a.feeAccrued, 0) / 2; // vault fee, USDC≈USD
  const gm = await gnarsMorEarned(mor);
  // Total staked backing riders = Morpho vault TVL + Morpheus (MOR) deposits, USD.
  const morTvl = athletes.reduce(
    (s, a) => s + a.backers.reduce((x, b) => x + (b.kind === "mor" ? b.amount : 0), 0),
    0,
  );
  const graph: StakeGraph = {
    athletes,
    total: athletes.reduce((s, a) => s + a.total, 0) + morTvl,
    backerCount: distinct.size,
    backersResolved,
    gnarsAccrued,
    gnarsMor: gm.mor,
    gnarsMorUsd: gm.usd,
    treasuryUsd: gnarsAccrued + gm.usd,
  };

  // Throwing is the ONLY way to keep a degraded graph out of `unstable_cache` —
  // the wrapper caches whatever the callback returns, and it cannot be told
  // "compute this but don't store it". So the partial graph rides out on the
  // error, and `loadStakeGraph` below decides what the page should show. The
  // TVL in it is still exact (it comes from `totalAssets()`, not from the
  // backer list), which is what makes serving it a reasonable degraded state
  // rather than a lie.
  if (!backersResolved) throw new StakeGraphDegradedError(graph);
  return graph;
}

/**
 * The cached entry point every caller should use. `StakeGraph` is plain
 * numbers/strings, so it survives the cache's JSON round-trip unchanged — no
 * re-hydration needed (contrast `services/proposals.ts`, which has to restore a
 * `Date`).
 */
export const getStakeGraph = unstable_cache(fetchStakeGraphUncached, ["stake-graph"], {
  tags: [CACHE_TAGS.stake],
  revalidate: GRAPH_TTL_SECONDS,
});

/**
 * The last graph we knew to be complete, held in module memory.
 *
 * Deliberately NOT the data cache: the whole point is that a degraded graph
 * must not be persisted, and this survives only as long as the server instance
 * does. On a cold instance it is null and the degraded path falls back to the
 * partial graph, which is the honest worst case — TVL, no orbit, and a page
 * that says so.
 */
let lastCompleteGraph: StakeGraph | null = null;

function degradedGraphFrom(err: unknown): StakeGraph | null {
  if (typeof err !== "object" || err === null) return null;
  const e = err as { isStakeGraphDegraded?: boolean; degradedGraph?: StakeGraph };
  return e.isStakeGraphDegraded && e.degradedGraph ? e.degradedGraph : null;
}

/**
 * What every caller should use. Failing loud must not mean failing the VISITOR:
 * an indexer being down is our problem, not a reason to hand someone an error
 * page where a page with real TVL would do.
 *
 * The order is: complete graph → last complete graph this instance saw →
 * partial graph flagged `backersResolved: false`. Only a genuinely broken graph
 * (chain reads down, prices unavailable) throws on to the route's 500.
 *
 * `degraded` is returned separately from the payload because it governs
 * CACHING, not rendering: a degraded response must not be stored by the CDN
 * either, or the same empty orbit gets pinned for the whole s-maxage window —
 * the CDN being the one cache `revalidateTag` cannot reach.
 */
export async function loadStakeGraph(): Promise<{ graph: StakeGraph; degraded: boolean }> {
  try {
    const graph = await getStakeGraph();
    lastCompleteGraph = graph;
    return { graph, degraded: false };
  } catch (err) {
    const partial = degradedGraphFrom(err);
    if (!partial) throw err;
    // Stale-but-true beats fresh-but-blank: this graph's backers were really
    // there, minutes ago, which is far closer to the truth than an empty orbit.
    if (lastCompleteGraph) return { graph: lastCompleteGraph, degraded: true };
    return { graph: partial, degraded: true };
  }
}
