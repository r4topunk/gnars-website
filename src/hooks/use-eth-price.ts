"use client";

import { useQuery } from "@tanstack/react-query";

interface EthPriceResponse {
  /** `null` when the price feed is unavailable — never 0-as-unknown. */
  usd: number | null;
  error?: string;
}

/**
 * The single client-side ETH price. Every component that needs it must go
 * through this hook rather than its own `useQuery` — one shared query key is
 * what lets React Query dedupe them into one request per window.
 *
 * `/api/eth-price` is a thin wrapper over `services/prices` (Alchemy, 300s).
 * `usd` is `null` when unknown; `?? 0` keeps that falsy so `formatEthToUsd`
 * renders "—" rather than "$0.00".
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
    // Matched to the route's CDN window. There is no `refetchInterval`: the old
    // 60s poll re-fetched five times per cache window across every mounted
    // consumer (bounties, member profiles) and got the same bytes each time.
    staleTime: 5 * 60 * 1000,
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
