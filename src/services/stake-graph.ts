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
//  - The API route wraps this with s-maxage + stale-while-revalidate.

import { createPublicClient, http, fallback, formatUnits, getAddress, keccak256, toHex, erc20Abi, type Address } from "viem";
import { base, mainnet } from "viem/chains";
import { RIDER_LIST, type RiderId } from "@/lib/gnars-vaults";
import {
  MORPHEUS_POOLS, MOR_REWARD_POOL_INDEX, MOR_TOKEN, MOR_DECIMALS, MOR_GNARS_RECIPIENT, depositPoolAbi,
} from "@/lib/morpheus";
import { splitMorBalance, arbitrumClient } from "@/lib/mor-split";

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
  type: "event", name: "UserReferred",
  inputs: [
    { name: "rewardPoolIndex", type: "uint256", indexed: true },
    { name: "user", type: "address", indexed: true },
    { name: "referrer", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
  ],
} as const;

const vaultAbi = [
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

export type OrbitBacker = {
  address: Address;
  amount: number;
  /** "vault" = Morpho USDC sponsorship vault (Base); "mor" = Morpheus stake (mainnet). */
  kind: "vault" | "mor";
  asset?: "steth" | "usdc";
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
  /** Gnars' share of the Morpho vault performance fee accrued so far, in USD. */
  gnarsAccrued: number;
  /** MOR earned for the Gnars treasury (distributed + its 25% still in splits). */
  gnarsMor: number;
  /** That MOR valued in USD. */
  gnarsMorUsd: number;
  /** Total earned for the treasury in USD = vault fee + MOR value. */
  treasuryUsd: number;
};

const ZERO = "0x0000000000000000000000000000000000000000";

async function backerAddresses(vault: Address, feeRecipient?: Address): Promise<Address[]> {
  const out = new Set<Address>();
  try {
    const res = await fetch(`https://base.blockscout.com/api/v2/tokens/${vault}/transfers`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(9000),
    });
    if (res.ok) {
      const json = (await res.json()) as { items?: { to?: { hash?: string }; from?: { hash?: string } }[] };
      for (const t of json.items ?? []) {
        for (const raw of [t.to?.hash, t.from?.hash]) {
          if (raw && raw.toLowerCase() !== ZERO) {
            try { out.add(getAddress(raw)); } catch { /* skip */ }
          }
        }
      }
    }
  } catch { /* fall through */ }
  if (feeRecipient) out.delete(getAddress(feeRecipient));
  return [...out];
}

async function getEthUsd(): Promise<number> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return 0;
    const j = (await res.json()) as { ethereum?: { usd?: number } };
    return j.ethereum?.usd ?? 0;
  } catch {
    return 0;
  }
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
async function etherscanReferred(pool: Address, referrer: Address, key: string): Promise<Array<{ user: Address; amount: bigint }>> {
  const url =
    `https://api.etherscan.io/v2/api?chainid=1&module=logs&action=getLogs&address=${pool}` +
    `&topic0=${USER_REFERRED_SIG}&topic0_3_opr=and&topic3=${pad32(referrer)}` +
    `&fromBlock=0&toBlock=latest&page=1&offset=1000&apikey=${key}`;
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const j = (await res.json()) as { status?: string; message?: string; result?: unknown };
      if (j.status === "1" && Array.isArray(j.result)) {
        return (j.result as Array<{ topics: string[]; data: string }>).map((l) => ({ user: getAddress(`0x${l.topics[2].slice(26)}`), amount: BigInt(l.data) }));
      }
      // The rate-limit note lives in `result` ("Max calls per sec rate limit
      // reached (3/sec)"), not `message` — retry with backoff before giving up.
      if (/rate limit/i.test(String(j.message)) || /rate limit/i.test(String(j.result))) { await sleep(600); continue; }
      return []; // "No records found" / bad key
    } catch { await sleep(300); }
  }
  return [];
}

async function morBackersByRider(ethUsd: number): Promise<Record<string, OrbitBacker[]>> {
  const walletToId = new Map<string, RiderId>();
  for (const r of RIDER_LIST) if (r.wallet) walletToId.set(r.wallet.toLowerCase(), r.id);
  const referrers = [...walletToId.keys()].map((a) => getAddress(a));
  const byRider: Record<string, OrbitBacker[]> = {};
  if (referrers.length === 0) return byRider;

  // Primary: Etherscan hosted logs (datacenter-safe). One call per (pool, rider),
  // all in parallel; the staked amount comes straight from the event.
  if (ETHERSCAN_KEY) {
    const idWallets = RIDER_LIST.filter((r) => r.wallet).map((r) => [r.id, r.wallet as Address] as const);
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
          for (const l of logs) byUser.set(l.user.toLowerCase(), (byUser.get(l.user.toLowerCase()) ?? BigInt(0)) + l.amount);
          const out: Array<{ id: RiderId; backer: OrbitBacker }> = [];
          for (const [userLc, amt] of byUser) {
            const tokens = Number(formatUnits(amt, decimals));
            const usd = asset === "steth" ? tokens * ethUsd : tokens;
            if (usd > 0) out.push({ id, backer: { address: getAddress(userLc), amount: usd, kind: "mor", asset } });
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
  try { latest = await ethClient.getBlockNumber(); } catch { return byRider; }
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
          ethClient.getLogs({
            address: pool, event: userReferredEvent,
            args: { rewardPoolIndex: MOR_REWARD_POOL_INDEX, referrer: referrers },
            fromBlock, toBlock,
          }).catch(() => []),
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
          address: pool, abi: depositPoolAbi, functionName: "usersData",
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
        const amount = asset === "steth" ? tokens * ethUsd : tokens;
        if (amount <= 0) return;
        rows.push({ id, backer: { address: getAddress(u), amount, kind: "mor", asset } });
      });
      return rows;
    }),
  );

  for (const { id, backer } of perPool.flat()) (byRider[id] ||= []).push(backer);
  return byRider;
}

async function getMorUsd(): Promise<number> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/arbitrum-one?contract_addresses=${MOR_TOKEN}&vs_currencies=usd`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return 0;
    const j = (await res.json()) as Record<string, { usd?: number }>;
    return j?.[MOR_TOKEN.toLowerCase()]?.usd ?? 0;
  } catch {
    return 0;
  }
}

/**
 * MOR earned for the Gnars treasury: what's already been distributed to the
 * Gnars Arbitrum multisig, plus Gnars' 25% share still sitting undistributed in
 * each staker's split. Best-effort — priced in USD via CoinGecko.
 */
async function gnarsMorEarned(morByRider: Record<string, OrbitBacker[]>): Promise<{ mor: number; usd: number }> {
  const walletById = new Map<string, Address>();
  for (const r of RIDER_LIST) if (r.wallet) walletById.set(r.id, r.wallet);

  // Unique (staker, athlete) pairs → the per-staker splits holding MOR.
  const pairs = new Map<string, [Address, Address]>();
  for (const [id, backers] of Object.entries(morByRider)) {
    const ref = walletById.get(id);
    if (!ref) continue;
    for (const b of backers) pairs.set(`${b.address}-${ref}`.toLowerCase(), [b.address, ref]);
  }

  try {
    const [splitBals, directRaw, morUsd] = await Promise.all([
      Promise.all([...pairs.values()].map(([s, a]) => splitMorBalance(s, a).catch(() => 0))),
      arbitrumClient
        .readContract({ address: MOR_TOKEN, abi: erc20Abi, functionName: "balanceOf", args: [MOR_GNARS_RECIPIENT] })
        .then((b) => Number(formatUnits(b, MOR_DECIMALS)))
        .catch(() => 0),
      getMorUsd(),
    ]);
    const pendingGnars = splitBals.reduce((s, v) => s + v, 0) * 0.25; // Gnars = 25% of each split
    const mor = pendingGnars + directRaw;
    return { mor, usd: mor * morUsd };
  } catch {
    return { mor: 0, usd: 0 };
  }
}

export async function getStakeGraph(): Promise<StakeGraph> {
  const live = RIDER_LIST.filter((r) => r.vault);
  if (live.length === 0) return { athletes: [], total: 0, backerCount: 0, gnarsAccrued: 0, gnarsMor: 0, gnarsMorUsd: 0, treasuryUsd: 0 };

  const ethUsd = await getEthUsd();
  const [athletes, mor] = await Promise.all([
    Promise.all(
      live.map(async (r): Promise<OrbitAthlete> => {
        const vault = r.vault as Address;
        const candidates = await backerAddresses(vault, r.split);

        // Everything this vault needs in ONE aggregated call.
        const contracts = [
          { address: vault, abi: vaultAbi, functionName: "totalAssets", args: [] },
          { address: vault, abi: vaultAbi, functionName: "totalSupply", args: [] },
          ...candidates.map((a) => ({ address: vault, abi: vaultAbi, functionName: "balanceOf", args: [a] })),
          ...(r.split ? [{ address: vault, abi: vaultAbi, functionName: "balanceOf", args: [r.split as Address] }] : []),
        ];
        const res = await baseClient.multicall({
          allowFailure: true,
          contracts: contracts as Parameters<typeof baseClient.multicall>[0]["contracts"],
        });

        const totalAssets = (res[0].result as bigint | undefined) ?? BigInt(0);
        const totalSupply = (res[1].result as bigint | undefined) ?? BigInt(0);
        const toAssets = (shares: bigint) => (totalSupply > BigInt(0) ? (shares * totalAssets) / totalSupply : BigInt(0));

        const backers: OrbitBacker[] = [];
        candidates.forEach((addr, i) => {
          const shares = (res[2 + i].result as bigint | undefined) ?? BigInt(0);
          if (shares <= BigInt(0)) return;
          backers.push({ address: addr, amount: Number(formatUnits(toAssets(shares), 6)), kind: "vault" });
        });
        backers.sort((a, b) => b.amount - a.amount);

        let feeAccrued = 0;
        if (r.split) {
          const sShares = (res[2 + candidates.length].result as bigint | undefined) ?? BigInt(0);
          feeAccrued = Number(formatUnits(toAssets(sShares), 6));
        }

        return {
          id: r.id, handle: r.handle, vault, split: r.split,
          total: Number(formatUnits(totalAssets, 6)), feeAccrued, backers,
        };
      }),
    ),
    morBackersByRider(ethUsd),
  ]);

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
  return {
    athletes,
    total: athletes.reduce((s, a) => s + a.total, 0) + morTvl,
    backerCount: distinct.size,
    gnarsAccrued,
    gnarsMor: gm.mor,
    gnarsMorUsd: gm.usd,
    treasuryUsd: gnarsAccrued + gm.usd,
  };
}
