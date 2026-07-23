"use client";

// Who is backing a rider. The vault's shares are an ERC-20, so the holder list
// IS the supporter list — no event scanning needed. Each holder's position is
// their share of totalAssets.
//
// The performance-fee recipient (the 0xSplits contract) also shows up as a
// holder, because the fee is minted to it as shares. That's not a supporter, so
// it's flagged rather than hidden — it's the yield already earmarked for Gnars
// and the athlete.

import { useEffect, useState } from "react";
import { createPublicClient, http, fallback, formatUnits, getAddress, type Address } from "viem";
import { base } from "viem/chains";

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
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export type Supporter = {
  address: Address;
  /** Position in USDC. */
  assets: number;
  /** Fraction of the vault, 0–1. */
  share: number;
  /** True for the fee recipient (Gnars + athlete's accrued cut), not a depositor. */
  isFeeRecipient: boolean;
};

type HolderItem = { address?: { hash?: string }; value?: string };

export function useVaultSupporters(vault?: Address, feeRecipient?: Address): Supporter[] | null {
  const [supporters, setSupporters] = useState<Supporter[] | null>(null);

  useEffect(() => {
    if (!vault) {
      setSupporters(null);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const [res, totalAssets, totalSupply] = await Promise.all([
          fetch(`https://base.blockscout.com/api/v2/tokens/${vault}/holders`, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(9000),
          }),
          client.readContract({ address: vault, abi, functionName: "totalAssets" }),
          client.readContract({ address: vault, abi, functionName: "totalSupply" }),
        ]);
        if (cancelled) return;
        if (!res.ok || totalSupply === BigInt(0)) { setSupporters([]); return; }

        const json = (await res.json()) as { items?: HolderItem[] };
        const assetsTotal = Number(formatUnits(totalAssets, 6));

        const rows = (json.items ?? [])
          .map((it) => {
            const raw = it.address?.hash;
            const value = it.value;
            if (!raw || !value) return null;
            let address: Address;
            try { address = getAddress(raw); } catch { return null; }
            const shares = BigInt(value);
            if (shares <= BigInt(0)) return null;
            // Position = this holder's slice of what the vault actually holds.
            const share = Number(shares) / Number(totalSupply);
            return {
              address,
              assets: assetsTotal * share,
              share,
              isFeeRecipient: !!feeRecipient && address.toLowerCase() === feeRecipient.toLowerCase(),
            } satisfies Supporter;
          })
          .filter((r): r is Supporter => r !== null)
          .sort((a, b) => b.assets - a.assets);

        if (!cancelled) setSupporters(rows);
      } catch {
        if (!cancelled) setSupporters(null);
      }
    })();

    return () => { cancelled = true; };
  }, [vault, feeRecipient]);

  return supporters;
}
