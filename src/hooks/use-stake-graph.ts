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
import { base } from "viem/chains";
import { RIDER_LIST, type RiderId } from "@/lib/gnars-vaults";

const client = createPublicClient({
  chain: base,
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

export type OrbitBacker = { address: Address; amount: number };
export type OrbitAthlete = {
  id: RiderId;
  handle: string;
  vault: Address;
  split?: Address;
  total: number;
  backers: OrbitBacker[];
};
export type StakeGraph = {
  athletes: OrbitAthlete[];
  total: number;
  /** Distinct backer addresses across all riders. */
  backerCount: number;
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

export function useStakeGraph(nonce = 0): StakeGraph | null {
  const [graph, setGraph] = useState<StakeGraph | null>(null);

  useEffect(() => {
    const live = RIDER_LIST.filter((r) => r.vault);
    if (live.length === 0) { setGraph({ athletes: [], total: 0, backerCount: 0 }); return; }
    let cancelled = false;

    (async () => {
      try {
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
              backers.push({ address, amount: Number(formatUnits(assets, 6)) });
            }
            backers.sort((a, b) => b.amount - a.amount);
            return {
              id: r.id, handle: r.handle, vault, split: r.split,
              total: Number(formatUnits(totalRaw, 6)), backers,
            };
          }),
        );
        if (cancelled) return;
        const distinct = new Set<string>();
        athletes.forEach((a) => a.backers.forEach((b) => distinct.add(b.address.toLowerCase())));
        setGraph({
          athletes,
          total: athletes.reduce((s, a) => s + a.total, 0),
          backerCount: distinct.size,
        });
      } catch {
        if (!cancelled) setGraph(null);
      }
    })();

    return () => { cancelled = true; };
  }, [nonce]);

  return graph;
}
