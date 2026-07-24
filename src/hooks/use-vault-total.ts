"use client";

// Total currently staked in a rider's sponsorship vault, read straight from the
// contract. Returns null while loading, when the rider has no vault yet, or if
// the read fails — callers should show "no vault yet" rather than a fake $0.

import { useEffect, useState } from "react";
import { createPublicClient, http, fallback, formatUnits, type Address } from "viem";
import { base } from "viem/chains";

const client = createPublicClient({
  chain: base,
  // Datacenter IPs get rate-limited on a single endpoint; fall through instead.
  transport: fallback([
    http("https://mainnet.base.org"),
    http("https://base-rpc.publicnode.com"),
    http("https://base.drpc.org"),
  ]),
});

const abi = [
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "convertToAssets", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
] as const;

/**
 * What a given account currently has in a vault, in USDC. Read via
 * convertToAssets(balanceOf) — `maxWithdraw` reports 0 while the liquidity sits
 * in the adapter, so it can't be used here.
 *
 * `nonce` lets callers force a refetch after a deposit/withdraw lands.
 */
export function useVaultPosition(
  vault?: Address,
  account?: string,
  nonce = 0,
): { shares: bigint; assets: number } | null {
  const [pos, setPos] = useState<{ shares: bigint; assets: number } | null>(null);

  useEffect(() => {
    if (!vault || !account) {
      setPos(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const shares = await client.readContract({
          address: vault, abi, functionName: "balanceOf", args: [account as Address],
        });
        if (cancelled) return;
        if (shares === BigInt(0)) { setPos({ shares: BigInt(0), assets: 0 }); return; }
        const assets = await client.readContract({
          address: vault, abi, functionName: "convertToAssets", args: [shares],
        });
        if (!cancelled) setPos({ shares, assets: Number(formatUnits(assets, 6)) });
      } catch {
        if (!cancelled) setPos(null);
      }
    })();
    return () => { cancelled = true; };
  }, [vault, account, nonce]);

  return pos;
}

type DecodedParam = { name?: string; value?: unknown };
type LogItem = { decoded?: { method_call?: string; parameters?: DecodedParam[] } | null };

/** Net principal an account put in: sum of its Deposit assets minus Withdraw assets. */
async function principalFromLogs(vault: Address, account: string): Promise<bigint> {
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
}

export type VaultEarned = {
  /** Current position value, USDC. */
  current: number;
  /** Net deposited, USDC. */
  principal: number;
  /** current − principal, floored at 0, USDC. */
  earned: number;
  /** Raw earned in USDC micro-units, for the withdraw call. */
  earnedRaw: bigint;
  shares: bigint;
};

/**
 * Splits a position into principal vs earned. Principal isn't stored per-user
 * on-chain, so it's reconstructed from the account's Deposit/Withdraw events;
 * the current value is read from the contract. `nonce` forces a refetch.
 */
export function useVaultEarned(vault?: Address, account?: string, nonce = 0): VaultEarned | null {
  const [data, setData] = useState<VaultEarned | null>(null);

  useEffect(() => {
    if (!vault || !account) { setData(null); return; }
    let cancelled = false;
    setData(null);
    (async () => {
      try {
        const shares = await client.readContract({
          address: vault, abi, functionName: "balanceOf", args: [account as Address],
        });
        if (cancelled) return;
        if (shares === BigInt(0)) {
          setData({ current: 0, principal: 0, earned: 0, earnedRaw: BigInt(0), shares: BigInt(0) });
          return;
        }
        const [currentRaw, principalRaw] = await Promise.all([
          client.readContract({ address: vault, abi, functionName: "convertToAssets", args: [shares] }),
          principalFromLogs(vault, account),
        ]);
        if (cancelled) return;
        const earnedRaw = currentRaw > principalRaw ? currentRaw - principalRaw : BigInt(0);
        setData({
          current: Number(formatUnits(currentRaw, 6)),
          principal: Number(formatUnits(principalRaw, 6)),
          earned: Number(formatUnits(earnedRaw, 6)),
          earnedRaw,
          shares,
        });
      } catch {
        if (!cancelled) setData(null);
      }
    })();
    return () => { cancelled = true; };
  }, [vault, account, nonce]);

  return data;
}

export function useVaultTotal(vault?: Address): number | null {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!vault) {
      setTotal(null);
      return;
    }
    let cancelled = false;
    setTotal(null);
    client
      .readContract({ address: vault, abi, functionName: "totalAssets" })
      .then((v) => { if (!cancelled) setTotal(Number(formatUnits(v, 6))); }) // USDC: 6 decimals
      .catch(() => { if (!cancelled) setTotal(null); });
    return () => { cancelled = true; };
  }, [vault]);

  return total;
}
