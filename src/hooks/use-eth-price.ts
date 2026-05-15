"use client";

import { useQuery } from "@tanstack/react-query";

interface EthPriceResponse {
  usd: number;
  error?: string;
}

/**
 * Hook to fetch current ETH price in USD
 * Uses the /api/eth-price endpoint which fetches from Alchemy
 */
export function useEthPrice() {
  const { data, isLoading, error } = useQuery<EthPriceResponse>({
    queryKey: ["eth-price"],
    queryFn: async () => {
      const res = await fetch("/api/eth-price");
      if (!res.ok) {
        throw new Error("Failed to fetch ETH price");
      }
      return res.json();
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  return {
    ethPrice: data?.usd ?? 0,
    isLoading,
    error,
  };
}

/**
 * Format ETH amount to USD string.
 *
 * `intlLocale` is a BCP-47 tag (e.g. "en-US", "pt-BR"). Defaults to "en-US"
 * so non-localized callers stay unchanged; pass the user's locale via
 * `toIntlLocale(useLocale())` from `@/lib/i18n/format` for localized output.
 */
export function formatEthToUsd(
  ethAmount: number,
  ethPrice: number,
  intlLocale: string = "en-US",
): string {
  if (!ethPrice || ethPrice === 0) return "—";
  const usd = ethAmount * ethPrice;
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}
