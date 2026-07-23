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

const abi = [{
  type: "function", name: "totalAssets", stateMutability: "view",
  inputs: [], outputs: [{ type: "uint256" }],
}] as const;

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
