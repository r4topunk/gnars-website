"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useSearchParams } from "next/navigation";
import type { Address } from "viem";

/**
 * Development helper: allows simulating a connected wallet via URL query param.
 * Usage (dev only): /proposals/117?debugAddress=0x...
 */
export function useMaybeDebugAccount(): { address?: Address; isConnected: boolean } {
  const { address, isConnected } = useAccount();
  const params = useSearchParams();

  return useMemo(() => {
    const debug = params?.get("debugAddress");
    if (process.env.NODE_ENV !== "development" || !debug) {
      return { address: address as Address | undefined, isConnected };
    }

    // Minimal validation
    const normalized = String(debug);
    const isAddr = /^0x[a-fA-F0-9]{40}$/.test(normalized);
    if (!isAddr) {
      return { address: address as Address | undefined, isConnected };
    }

    return { address: normalized as Address, isConnected: true };
  }, [address, isConnected, params]);
}
