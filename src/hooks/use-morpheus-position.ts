"use client";

// Read-only view of a wallet's Morpheus Capital positions (Phase 0): how much
// stETH / USDC it has staked, the MOR accrued so far, and when the 7-day
// withdraw lock lifts. All reads are on Ethereum mainnet; nothing here moves
// money.
import { useQuery } from "@tanstack/react-query";
import { createPublicClient, fallback, formatUnits, http, type Address } from "viem";
import { mainnet } from "viem/chains";
import {
  depositPoolAbi,
  MOR_DECIMALS,
  MOR_REWARD_POOL_INDEX,
  MORPHEUS_POOLS,
  WITHDRAW_LOCK_SECONDS,
  type MorpheusAsset,
} from "@/lib/morpheus";

const client = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http("https://ethereum.publicnode.com"),
    http("https://eth.llamarpc.com"),
    http("https://rpc.ankr.com/eth"),
  ]),
});

export type MorpheusPoolPosition = {
  asset: MorpheusAsset;
  symbol: string;
  /** Staked principal, in the deposit asset. */
  staked: number;
  /** MOR accrued and claimable so far. */
  pendingMor: number;
  /** Unix seconds when the withdraw lock lifts (0 if nothing staked). */
  unlockAt: number;
  /** Unix seconds when the MOR reward claim-lock lifts (claimLockEnd) — until
   * then the accrued MOR can't be claimed. 0 if none. This is the "power lock"
   * chosen at deposit: a longer lock buys a higher power factor / APR. */
  morUnlockAt: number;
  /** The athlete credited as referrer for this position (drives the 3-way split). */
  referrer: Address;
};

export type MorpheusPositions = {
  pools: MorpheusPoolPosition[];
  /** Total MOR accrued across pools. */
  totalMor: number;
  /** True if the wallet has any Morpheus stake at all. */
  hasStake: boolean;
};

async function fetchMorpheusPosition(wallet: string): Promise<MorpheusPositions> {
  const pools = await Promise.all(
    (Object.keys(MORPHEUS_POOLS) as MorpheusAsset[]).map(async (asset) => {
      const { pool, decimals, symbol } = MORPHEUS_POOLS[asset];
      const [data, reward] = await Promise.all([
        client.readContract({
          address: pool,
          abi: depositPoolAbi,
          functionName: "usersData",
          args: [wallet as Address, MOR_REWARD_POOL_INDEX],
        }),
        client.readContract({
          address: pool,
          abi: depositPoolAbi,
          functionName: "getLatestUserReward",
          args: [MOR_REWARD_POOL_INDEX, wallet as Address],
        }),
      ]);
      const lastStake = Number(data[0]); // uint128 lastStake
      const deposited = data[1]; // uint256 deposited
      const claimLockEnd = Number(data[5]); // uint128 claimLockEnd (MOR power lock)
      const referrer = data[8] as Address; // stored referrer (athlete)
      return {
        asset,
        symbol,
        staked: Number(formatUnits(deposited, decimals)),
        pendingMor: Number(formatUnits(reward, MOR_DECIMALS)),
        unlockAt: deposited > BigInt(0) ? lastStake + WITHDRAW_LOCK_SECONDS : 0,
        morUnlockAt: deposited > BigInt(0) ? claimLockEnd : 0,
        referrer,
      } satisfies MorpheusPoolPosition;
    }),
  );
  return {
    pools,
    totalMor: pools.reduce((s, p) => s + p.pendingMor, 0),
    hasStake: pools.some((p) => p.staked > 0),
  };
}

/**
 * Cached through react-query because PositionsHub and MorLootbox both mount this
 * for the connected wallet: without dedupe that's two identical batteries of
 * mainnet reads against public RPCs (publicnode/llama/ankr) per page load, plus
 * a full refetch on every remount. One key, one in-flight request, 30s fresh.
 *
 * `nonce` stays the post-transaction refetch mechanism: bumping it changes the
 * key, so a claim/stake re-reads immediately instead of waiting out staleTime.
 *
 * Returns null while loading, on error, or with no wallet — same contract as the
 * previous useEffect version. Placeholder data is kept only across nonces of the
 * SAME wallet (so the panel doesn't blank out mid-refresh); switching wallets
 * falls back to null rather than showing another account's money.
 */
export function useMorpheusPosition(wallet?: string, nonce = 0): MorpheusPositions | null {
  const { data } = useQuery({
    queryKey: ["morpheus-position", wallet, nonce] as const,
    queryFn: () => fetchMorpheusPosition(wallet as string),
    enabled: !!wallet,
    staleTime: 30_000,
    placeholderData: (prev, prevQuery) => {
      const prevWallet = prevQuery?.queryKey?.[1];
      return prevWallet === wallet ? prev : undefined;
    },
  });

  return data ?? null;
}
