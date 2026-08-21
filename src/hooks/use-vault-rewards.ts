"use client";

// Claimable Morpho yield across every rider sponsorship vault, so the reward
// panel can surface a "claim yield" per vault alongside the MOR rewards.
// earned = convertToAssets(shares) − principal, where principal is rebuilt from
// the account's Deposit/Withdraw events (same as the stake dialog).
//
// Guarded: if the principal read fails (Blockscout hiccup) it returns 0, which
// would make the whole position look like yield — so we SKIP any vault whose
// principal we couldn't confirm, rather than offer to withdraw the principal.
import { useQuery } from "@tanstack/react-query";
import { createPublicClient, fallback, formatUnits, http, type Address } from "viem";
import { base } from "viem/chains";
import { RIDERS, type RiderId } from "@/lib/gnars-vaults";
import { blockscoutGet } from "@/services/blockscout";

const client = createPublicClient({
  chain: base,
  transport: fallback([
    http("https://mainnet.base.org"),
    http("https://base-rpc.publicnode.com"),
    http("https://base.drpc.org"),
  ]),
});

const abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "convertToAssets",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

type DecodedParam = { name?: string; value?: unknown };
type LogItem = { decoded?: { method_call?: string; parameters?: DecodedParam[] } | null };

/** Net principal an account put in: sum of its Deposit assets minus Withdraw assets.
 *  Delegates the fetch to the crash-safe Blockscout helper — a 500 with a
 *  non-JSON body (the production "Internal server error") now degrades to 0
 *  instead of calling `.json()` on the text body. */
async function principalFromLogs(vault: Address, account: string): Promise<bigint> {
  const json = await blockscoutGet<{ items?: LogItem[] }>(`addresses/${vault}/logs`);
  if (!json) return BigInt(0);
  const me = account.toLowerCase();
  let principal = BigInt(0);
  for (const log of json.items ?? []) {
    const call = log.decoded?.method_call ?? "";
    const params = log.decoded?.parameters ?? [];
    const owner = params.find((p) => p.name === "owner")?.value;
    if (typeof owner !== "string" || owner.toLowerCase() !== me) continue;
    const assets = params.find((p) => p.name === "assets")?.value;
    if (typeof assets !== "string" && typeof assets !== "number") continue;
    const amt = BigInt(assets);
    if (call.startsWith("Deposit(")) principal += amt;
    else if (call.startsWith("Withdraw(")) principal -= amt;
  }
  return principal > BigInt(0) ? principal : BigInt(0);
}

export type VaultReward = {
  riderId: RiderId;
  vault: Address;
  /** USDC micro-units, for the claim (withdraw) call. */
  earnedRaw: bigint;
  /** USDC. */
  earned: number;
};

const DUST = BigInt(100); // 0.0001 USDC in 6-dec units

/** Stable empty result so consumers don't see a new array identity per render. */
const NO_REWARDS: VaultReward[] = [];

async function fetchVaultRewards(account: string): Promise<VaultReward[]> {
  const riders = Object.values(RIDERS).filter((r): r is Rider & { vault: Address } =>
    Boolean(r.vault),
  );
  // Cheap first pass — only the vaults where the wallet actually holds shares
  // are worth the (costlier) earned computation.
  const shares = await Promise.all(
    riders.map((r) =>
      client
        .readContract({
          address: r.vault,
          abi,
          functionName: "balanceOf",
          args: [account as Address],
        })
        .catch(() => BigInt(0)),
    ),
  );
  const held = riders.map((r, i) => ({ r, shares: shares[i] })).filter((x) => x.shares > BigInt(0));

  const out: VaultReward[] = [];
  for (const { r, shares: sh } of held) {
    const [current, principal] = await Promise.all([
      client
        .readContract({ address: r.vault, abi, functionName: "convertToAssets", args: [sh] })
        .catch(() => BigInt(0)),
      principalFromLogs(r.vault, account),
    ]);
    if (principal > BigInt(0) && current > principal) {
      const earnedRaw = current - principal;
      if (earnedRaw > DUST)
        out.push({
          riderId: r.id,
          vault: r.vault,
          earnedRaw,
          earned: Number(formatUnits(earnedRaw, 6)),
        });
    }
  }
  return out;
}

/**
 * Cached through react-query: this walks every rider vault on public Base RPCs
 * plus a Blockscout log query per held vault, so a remount or a second consumer
 * must not replay the whole sweep. One key per (account, nonce), 30s fresh.
 *
 * `nonce` remains the post-transaction refetch handle (bump it after a harvest).
 * Placeholder data carries over only between nonces of the SAME account, so the
 * reward panel keeps its rows while re-reading but never shows another wallet's.
 *
 * Returns [] while loading, on error, or with no account — same as before.
 */
export function useVaultRewards(account?: string, nonce = 0): VaultReward[] {
  const { data } = useQuery({
    queryKey: ["vault-rewards", account, nonce] as const,
    queryFn: () => fetchVaultRewards(account as string),
    enabled: !!account,
    staleTime: 30_000,
    placeholderData: (prev, prevQuery) => {
      const prevAccount = prevQuery?.queryKey?.[1];
      return prevAccount === account ? prev : undefined;
    },
  });

  return data ?? NO_REWARDS;
}

// Local alias so the type-guard predicate reads cleanly.
type Rider = (typeof RIDERS)[RiderId];
