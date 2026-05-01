"use client";

import { useQuery } from "@tanstack/react-query";
import { getWalletBalance } from "thirdweb/wallets";
import type { Address } from "viem";
import { getThirdwebClient } from "@/lib/thirdweb";
import { NATIVE_TOKEN, type SwapChain, type SwapToken } from "./chains";

export interface TokenBalance {
  /** Raw balance in the smallest unit. */
  value: bigint;
  /** Human-formatted string (e.g. "0.5234"). */
  displayValue: string;
  /** Token decimals as reported by the chain. */
  decimals: number;
  /** Token symbol as reported by the chain. */
  symbol: string;
}

/**
 * Reads the user's balance for a given token on a given chain.
 *
 * Uses thirdweb's `getWalletBalance` so it works on any chain we configure
 * for the swap UI without depending on the wagmi config (which currently
 * only carries Base + Arbitrum transports). Polls every 30s while the
 * window is focused so the figure stays roughly fresh.
 *
 * Returns `null` when no wallet is connected — the caller decides how to
 * render that (we hide the balance line entirely in the swap widget).
 *
 * Honors `useUserAddress` view-mode semantics: pass the address straight
 * from `useUserAddress()` and the balance reflects the SA-vs-EOA toggle
 * the user picked in the wallet drawer.
 */
export function useTokenBalance({
  chain,
  userAddress,
  token,
}: {
  chain: SwapChain;
  userAddress: Address | undefined;
  token: SwapToken;
}) {
  const client = getThirdwebClient();
  const enabled = Boolean(client) && Boolean(userAddress);

  return useQuery<TokenBalance | null>({
    queryKey: ["swap-token-balance", chain.id, userAddress, token.address] as const,
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!client || !userAddress) return null;

      const balance = await getWalletBalance({
        client,
        chain: chain.thirdwebChain,
        address: userAddress,
        // Native asset → omit tokenAddress; ERC-20 → pass the contract.
        tokenAddress: token.address === NATIVE_TOKEN ? undefined : (token.address as Address),
      });

      return {
        value: balance.value,
        displayValue: balance.displayValue,
        decimals: balance.decimals,
        symbol: balance.symbol,
      };
    },
  });
}

/**
 * Best-effort friendly format for a balance string (e.g. "1234.5678" → "1,234.57").
 */
export function formatBalanceDisplay(displayValue: string | undefined): string {
  if (!displayValue) return "—";
  const num = Number(displayValue);
  if (!Number.isFinite(num)) return displayValue;
  if (num === 0) return "0";
  if (num < 0.0001) return num.toExponential(2);
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(4);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
