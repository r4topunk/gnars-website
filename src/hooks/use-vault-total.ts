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
