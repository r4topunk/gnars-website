"use client";

// The whole sponsorship graph in one read: every rider vault's total, and who
// backs it for how much. Feeds the orbital view, where the per-rider supporters
// list can't show a backer's positions across riders at once.
//
// Depositors are found from each vault's share-token transfers (a deposit mints
// shares, from 0x0), then every balance is read from the contract — the index
// only says WHO to ask about, never how much.

import { useEffect, useState } from "react";
import { createPublicClient, http, fallback, formatUnits, getAddress, type Address } from "viem";
import { base, mainnet } from "viem/chains";
import { RIDER_LIST, type RiderId } from "@/lib/gnars-vaults";
import { MORPHEUS_POOLS, MOR_REWARD_POOL_INDEX, depositPoolAbi } from "@/lib/morpheus";

const client = createPublicClient({
  chain: base,
  transport: fallback([
    http("https://mainnet.base.org"),
    http("https://base-rpc.publicnode.com"),
    http("https://base.drpc.org"),
  ]),
});

// Morpheus deposits live on Ethereum mainnet; a separate client reads them.
const ethClient = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http("https://ethereum.publicnode.com"),
    http("https://eth.llamarpc.com"),
    http("https://rpc.ankr.com/eth"),
  ]),
});

// The referrer is indexed, so we can pull exactly the Morpheus stakes that named
// one of our riders — cheaply, without scanning every staker on the pool.
const userReferredEvent = {
  type: "event", name: "UserReferred",
  inputs: [
    { name: "rewardPoolIndex", type: "uint256", indexed: true },
    { name: "user", type: "address", indexed: true },
    { name: "referrer", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
  ],
} as const;

const abi = [
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "convertToAssets", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
] as const;

export type OrbitBacker = {
  address: Address;
  amount: number;
  /** "vault" = Morpho USDC sponsorship vault (Base); "mor" = Morpheus stake (mainnet). */
  kind: "vault" | "mor";
  /** For MOR backers, which asset they staked. */
  asset?: "steth" | "usdc";
};
export type OrbitAthlete = {
  id: RiderId;
  handle: string;
  vault: Address;
  split?: Address;
  total: number;
  /** Fee accrued to the split for this vault (the shares minted to it), in USDC. */
  feeAccrued: number;
  backers: OrbitBacker[];
};
export type StakeGraph = {
  athletes: OrbitAthlete[];
  total: number;
  /** Distinct backer addresses across all riders. */
  backerCount: number;
  /** The Gnars treasury's earned share so far = half of the accrued fee. */
  gnarsAccrued: number;
};

const ZERO = "0x0000000000000000000000000000000000000000";

async function backerAddresses(vault: Address, feeRecipient?: Address): Promise<Set<Address>> {
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
  // The fee recipient (the split) holds shares too — it's not a backer, drop it.
  if (feeRecipient) out.delete(getAddress(feeRecipient));
  return out;
}

async function fetchEthUsd(): Promise<number> {
  try {
    const res = await fetch("/api/eth-price");
    if (!res.ok) return 0;
    const json = (await res.json()) as { usd?: number };
    return json.usd ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Morpheus (MOR) backers per rider — the mainnet stakes that named a rider as
 * referrer. Kept separate from the vault backers, so a wallet that staked on
 * BOTH shows up twice (a green MOR stream and a Morpho one). Best-effort: on any
 * RPC hiccup the orbit just falls back to the vault backers.
 */
async function morBackersByRider(ethUsd: number): Promise<Record<string, OrbitBacker[]>> {
  const walletToId = new Map<string, RiderId>();
  for (const r of RIDER_LIST) if (r.wallet) walletToId.set(r.wallet.toLowerCase(), r.id);
  const referrers = [...walletToId.keys()].map((a) => getAddress(a));
  const out: Record<string, OrbitBacker[]> = {};
  if (referrers.length === 0) return out;

  let latest: bigint;
  try { latest = await ethClient.getBlockNumber(); } catch { return out; }
  // Gnars referrals only started recently; a ~2-week window (chunked to stay
  // under public-RPC getLogs limits) covers them without a full-history scan.
  const WINDOW = BigInt(90_000);
  const CHUNK = BigInt(45_000);
  const from0 = latest > WINDOW ? latest - WINDOW : BigInt(0);

  const pools: Array<{ asset: "steth" | "usdc"; pool: Address; decimals: number }> = [
    { asset: "steth", pool: MORPHEUS_POOLS.stEth.pool, decimals: 18 },
    { asset: "usdc", pool: MORPHEUS_POOLS.usdc.pool, decimals: 6 },
  ];

  for (const { asset, pool, decimals } of pools) {
    const userToRef = new Map<string, string>(); // user (lc) -> referrer (lc)
    for (let start = from0; start <= latest; start += CHUNK + BigInt(1)) {
      const end = start + CHUNK > latest ? latest : start + CHUNK;
      try {
        const logs = await ethClient.getLogs({
          address: pool, event: userReferredEvent,
          args: { rewardPoolIndex: MOR_REWARD_POOL_INDEX, referrer: referrers },
          fromBlock: start, toBlock: end,
        });
        for (const l of logs) {
          const user = l.args.user as Address | undefined;
          const ref = l.args.referrer as Address | undefined;
          if (user && ref) userToRef.set(user.toLowerCase(), ref.toLowerCase());
        }
      } catch { /* skip this chunk */ }
    }

    for (const [userLc, refLc] of userToRef) {
      const id = walletToId.get(refLc);
      if (!id) continue;
      try {
        const ud = (await ethClient.readContract({
          address: pool, abi: depositPoolAbi, functionName: "usersData",
          args: [getAddress(userLc), MOR_REWARD_POOL_INDEX],
        })) as unknown as readonly bigint[];
        const deposited = ud[1] ?? BigInt(0); // struct field: deposited
        if (deposited <= BigInt(0)) continue;
        const tokens = Number(formatUnits(deposited, decimals));
        const amount = asset === "steth" ? tokens * ethUsd : tokens; // stETH≈ETH, USDC=$1
        if (amount <= 0) continue;
        (out[id] ||= []).push({ address: getAddress(userLc), amount, kind: "mor", asset });
      } catch { /* skip this user */ }
    }
  }
  return out;
}

export function useStakeGraph(nonce = 0): StakeGraph | null {
  const [graph, setGraph] = useState<StakeGraph | null>(null);

  useEffect(() => {
    const live = RIDER_LIST.filter((r) => r.vault);
    if (live.length === 0) { setGraph({ athletes: [], total: 0, backerCount: 0, gnarsAccrued: 0 }); return; }
    let cancelled = false;

    (async () => {
      try {
        const ethUsd = await fetchEthUsd();
        const morPromise = morBackersByRider(ethUsd);
        const athletes = await Promise.all(
          live.map(async (r): Promise<OrbitAthlete> => {
            const vault = r.vault as Address;
            const totalRaw = await client.readContract({ address: vault, abi, functionName: "totalAssets" });
            const candidates = await backerAddresses(vault, r.split);
            const backers: OrbitBacker[] = [];
            for (const address of candidates) {
              const shares = await client.readContract({ address: vault, abi, functionName: "balanceOf", args: [address] });
              if (shares <= BigInt(0)) continue;
              const assets = await client.readContract({ address: vault, abi, functionName: "convertToAssets", args: [shares] });
              backers.push({ address, amount: Number(formatUnits(assets, 6)), kind: "vault" });
            }
            backers.sort((a, b) => b.amount - a.amount);

            // The performance fee is minted to the split as vault shares — its
            // position is the fee accrued so far.
            let feeAccrued = 0;
            if (r.split) {
              const sShares = await client.readContract({ address: vault, abi, functionName: "balanceOf", args: [r.split as Address] });
              if (sShares > BigInt(0)) {
                const sAssets = await client.readContract({ address: vault, abi, functionName: "convertToAssets", args: [sShares] });
                feeAccrued = Number(formatUnits(sAssets, 6));
              }
            }
            return {
              id: r.id, handle: r.handle, vault, split: r.split,
              total: Number(formatUnits(totalRaw, 6)), feeAccrued, backers,
            };
          }),
        );
        const mor = await morPromise;
        if (cancelled) return;
        // Attach MOR backers (kept distinct from vault backers) and re-rank.
        for (const a of athletes) {
          const m = mor[a.id];
          if (m && m.length) {
            a.backers.push(...m);
            a.backers.sort((x, y) => y.amount - x.amount);
          }
        }
        const distinct = new Set<string>();
        athletes.forEach((a) => a.backers.forEach((b) => distinct.add(b.address.toLowerCase())));
        setGraph({
          athletes,
          total: athletes.reduce((s, a) => s + a.total, 0),
          backerCount: distinct.size,
          // Split is Gnars 50 / athlete 50, so the treasury's share is half.
          gnarsAccrued: athletes.reduce((s, a) => s + a.feeAccrued, 0) / 2,
        });
      } catch {
        if (!cancelled) setGraph(null);
      }
    })();

    return () => { cancelled = true; };
  }, [nonce]);

  return graph;
}
