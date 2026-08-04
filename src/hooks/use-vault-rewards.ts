"use client";

// Claimable Morpho yield across every rider sponsorship vault, so the reward
// panel can surface a "claim yield" per vault alongside the MOR rewards.
// earned = convertToAssets(shares) − principal, where principal is rebuilt from
// the account's Deposit/Withdraw events (same as the stake dialog).
//
// Guarded: if the principal read fails (Blockscout hiccup) it returns 0, which
// would make the whole position look like yield — so we SKIP any vault whose
// principal we couldn't confirm, rather than offer to withdraw the principal.

import { useEffect, useState } from "react";
import { createPublicClient, http, fallback, formatUnits, type Address } from "viem";
import { base } from "viem/chains";
import { RIDERS, type RiderId } from "@/lib/gnars-vaults";

const client = createPublicClient({
  chain: base,
  transport: fallback([
    http("https://mainnet.base.org"),
    http("https://base-rpc.publicnode.com"),
    http("https://base.drpc.org"),
  ]),
});

const abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "convertToAssets", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
] as const;

type DecodedParam = { name?: string; value?: unknown };
type LogItem = { decoded?: { method_call?: string; parameters?: DecodedParam[] } | null };

/** Net principal an account put in: sum of its Deposit assets minus Withdraw assets. */
async function principalFromLogs(vault: Address, account: string): Promise<bigint> {
  try {
    const res = await fetch(`https://base.blockscout.com/api/v2/addresses/${vault}/logs`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return BigInt(0);
    const json = (await res.json()) as { items?: LogItem[] };
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
  } catch {
    return BigInt(0);
  }
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

export function useVaultRewards(account?: string, nonce = 0): VaultReward[] {
  const [items, setItems] = useState<VaultReward[]>([]);

  useEffect(() => {
    if (!account) { setItems([]); return; }
    let cancelled = false;
    (async () => {
      const riders = Object.values(RIDERS).filter((r): r is Rider & { vault: Address } => Boolean(r.vault));
      // Cheap first pass — only the vaults where the wallet actually holds shares
      // are worth the (costlier) earned computation.
      const shares = await Promise.all(
        riders.map((r) =>
          client.readContract({ address: r.vault, abi, functionName: "balanceOf", args: [account as Address] }).catch(() => BigInt(0)),
        ),
      );
      const held = riders.map((r, i) => ({ r, shares: shares[i] })).filter((x) => x.shares > BigInt(0));

      const out: VaultReward[] = [];
      for (const { r, shares: sh } of held) {
        const [current, principal] = await Promise.all([
          client.readContract({ address: r.vault, abi, functionName: "convertToAssets", args: [sh] }).catch(() => BigInt(0)),
          principalFromLogs(r.vault, account),
        ]);
        if (principal > BigInt(0) && current > principal) {
          const earnedRaw = current - principal;
          if (earnedRaw > DUST) out.push({ riderId: r.id, vault: r.vault, earnedRaw, earned: Number(formatUnits(earnedRaw, 6)) });
        }
      }
      if (!cancelled) setItems(out);
    })();
    return () => { cancelled = true; };
  }, [account, nonce]);

  return items;
}

// Local alias so the type-guard predicate reads cleanly.
type Rider = (typeof RIDERS)[RiderId];
