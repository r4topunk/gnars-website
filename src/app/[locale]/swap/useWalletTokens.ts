"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAddress, type Address } from "viem";
import { NATIVE_TOKEN, type SwapChain, type SwapToken, type WalletToken } from "./chains";

/**
 * Fetches every ERC-20 token the connected user holds on the selected chain
 * via /api/wallet/tokens (Alchemy alchemy_getTokenBalances).
 *
 * Returns a merged token list: hardcoded curated tokens first (with their
 * vetted logos), then any discovered tokens the user holds that aren't already
 * in the curated set.
 *
 * As a side effect, pre-populates the swap-token-balance React Query cache
 * with the balance data returned by the API, so the token picker doesn't
 * need to fire separate RPC calls for each discovered token.
 */
export function useWalletTokens({
  chain,
  userAddress,
}: {
  chain: SwapChain;
  userAddress: Address | undefined;
}) {
  const queryClient = useQueryClient();
  const enabled = Boolean(userAddress);

  const query = useQuery<WalletToken[]>({
    queryKey: ["wallet-tokens", chain.id, userAddress],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch(`/api/wallet/tokens?address=${userAddress}&chainId=${chain.id}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Pre-populate the balance cache so TokenPicker doesn't fire a second
  // round of RPC calls — the discovery response already has all balances.
  React.useEffect(() => {
    if (!query.data || !userAddress) return;
    for (const t of query.data) {
      const key = ["swap-token-balance", chain.id, userAddress, t.address] as const;
      if (!queryClient.getQueryData(key)) {
        queryClient.setQueryData(key, {
          value: BigInt(t.balance),
          displayValue: t.displayBalance,
          decimals: t.decimals,
          symbol: t.symbol,
        });
      }
    }
  }, [query.data, userAddress, chain.id, queryClient]);

  const mergedTokens = React.useMemo((): readonly SwapToken[] => {
    if (!query.data?.length) return chain.tokens;

    // Normalise addresses for dedup check (hardcoded list uses mixed case).
    const hardcodedAddrs = new Set(chain.tokens.map((t) => t.address.toLowerCase()));

    const discovered: SwapToken[] = query.data
      .filter(
        (t) =>
          t.address.toLowerCase() !== NATIVE_TOKEN.toLowerCase() &&
          !hardcodedAddrs.has(t.address.toLowerCase()),
      )
      .map((t) => ({
        address: t.address as `0x${string}`,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        logo: t.logoUrl ?? undefined,
      }));

    return [...chain.tokens, ...discovered];
  }, [chain.tokens, query.data]);

  // USD values keyed by lowercase address for the picker sort.
  const usdValues = React.useMemo((): Map<string, number> => {
    const map = new Map<string, number>();
    for (const t of query.data ?? []) {
      if (t.usdValue !== null) map.set(t.address.toLowerCase(), t.usdValue);
    }
    return map;
  }, [query.data]);

  return { tokens: mergedTokens, usdValues, isLoading: query.isLoading };
}

/**
 * Resolves an arbitrary ERC-20 address to a SwapToken by calling
 * /api/wallet/token-lookup (Alchemy metadata + Zora image on Base).
 *
 * Only fires when `address` is a valid 0x address. Results are cached
 * for 24 h — token metadata is stable.
 */
export function useTokenLookup({ address, chainId }: { address: string; chainId: number }) {
  return useQuery<SwapToken | null>({
    queryKey: ["token-lookup", chainId, address.toLowerCase()],
    enabled: isAddress(address),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/wallet/token-lookup?address=${address}&chainId=${chainId}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.symbol) return null;
      return {
        address: data.address as `0x${string}`,
        symbol: data.symbol,
        name: data.name,
        decimals: data.decimals,
        logo: data.logoUrl ?? undefined,
      };
    },
  });
}
