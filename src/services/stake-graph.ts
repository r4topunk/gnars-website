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

import { createPublicClient, http, fallback, formatUnits, getAddress, type Address } from "viem";
import { base, mainnet } from "viem/chains";
import { RIDER_LIST, type RiderId } from "@/lib/gnars-vaults";
import { MORPHEUS_POOLS, MOR_REWARD_POOL_INDEX, depositPoolAbi } from "@/lib/morpheus";

// Prefer Alchemy (reliable, handles large getLogs) when the key is set, since
// the public RPCs frequently fail/timeout on the MOR log scan — and a swallowed
// failure there means a staker silently vanishes from the orbit.
const ALCHEMY = process.env.ALCHEMY_API_KEY;
// eth.drpc.org is the reliable getLogs fallback — the other free mainnet RPCs
// (publicnode/llama/ankr) reject or rate-limit eth_getLogs, which silently
// emptied the MOR log scan and dropped stakers from the orbit. Verified: drpc
// serves the exact referrer-filtered query in ~0.2s.
const ethRpcs = [
  ...(ALCHEMY ? [`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY}`] : []),
  "https://eth.drpc.org",
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
  gnarsAccrued: number;
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

async function morBackersByRider(ethUsd: number): Promise<Record<string, OrbitBacker[]>> {
  const walletToId = new Map<string, RiderId>();
  for (const r of RIDER_LIST) if (r.wallet) walletToId.set(r.wallet.toLowerCase(), r.id);
  const referrers = [...walletToId.keys()].map((a) => getAddress(a));
  const byRider: Record<string, OrbitBacker[]> = {};
  if (referrers.length === 0) return byRider;

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

export async function getStakeGraph(): Promise<StakeGraph> {
  const live = RIDER_LIST.filter((r) => r.vault);
  if (live.length === 0) return { athletes: [], total: 0, backerCount: 0, gnarsAccrued: 0 };

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
  return {
    athletes,
    total: athletes.reduce((s, a) => s + a.total, 0),
    backerCount: distinct.size,
    gnarsAccrued: athletes.reduce((s, a) => s + a.feeAccrued, 0) / 2,
  };
}
