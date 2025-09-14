import { useQuery } from "@tanstack/react-query";
import { GNARS_ADDRESSES } from "@/lib/config";

export type TreasuryAllocation = {
  name: string;
  value: number;
  color: string;
};

const DEFAULT_TREASURY_DATA: TreasuryAllocation[] = [
  { name: "ETH", value: 85.2, color: "#627EEA" },
  { name: "USDC", value: 8.5, color: "#2775CA" },
  { name: "Other", value: 4.1, color: "#F59E0B" },
  { name: "NFTs", value: 2.2, color: "#EF4444" },
];

type PortfolioToken = {
  token?: {
    name?: string;
    symbol?: string;
    balanceUSD?: number;
  };
};

type PortfolioResponse = {
  tokens?: Record<string, PortfolioToken[]>;
  nftNetWorth?: Record<string, number>;
};

export type TreasuryAllocationData = {
  allocation: TreasuryAllocation[];
  totalValueUsd: number | null;
  breakdown: string;
};

async function fetchTreasuryAllocation(): Promise<TreasuryAllocationData> {
  const apiUrl = `https://pioneers.dev/api/v1/portfolio/${GNARS_ADDRESSES.treasury}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error("Failed to fetch treasury allocation");
  }

  const data: PortfolioResponse = await response.json();

  // Tokens array lives at data.tokens[treasury]
  const tokens = data?.tokens?.[GNARS_ADDRESSES.treasury] ?? [];
  const nftNetWorth = Number(data?.nftNetWorth?.[GNARS_ADDRESSES.treasury] ?? 0) || 0;

  let ethUsd = 0;
  let usdcUsd = 0;
  let otherUsd = 0;

  if (Array.isArray(tokens)) {
    for (const entry of tokens) {
      const name = (entry?.token?.name || "").toString();
      const symbol = (entry?.token?.symbol || "").toString();
      const valueUsd = Number(entry?.token?.balanceUSD || 0) || 0;

      if (!valueUsd) continue;

      if (name === "Ethereum" || symbol.toUpperCase() === "ETH") {
        ethUsd += valueUsd;
      } else if (name === "USD Coin" || symbol.toUpperCase() === "USDC") {
        usdcUsd += valueUsd;
      } else {
        otherUsd += valueUsd;
      }
    }
  }

  const totalUsd = ethUsd + usdcUsd + otherUsd + nftNetWorth;

  if (totalUsd <= 0) {
    return {
      allocation: DEFAULT_TREASURY_DATA,
      totalValueUsd: null,
      breakdown: "Live data unavailable, showing defaults",
    };
  }

  const pct = (x: number) => Math.round((x / totalUsd) * 1000) / 10; // one decimal

  const allocation: TreasuryAllocation[] = [
    { name: "ETH", value: pct(ethUsd), color: "#627EEA" },
    { name: "USDC", value: pct(usdcUsd), color: "#2775CA" },
    { name: "Other", value: pct(otherUsd), color: "#F59E0B" },
    { name: "NFTs", value: pct(nftNetWorth), color: "#EF4444" },
  ];

  const toK = (n: number) => `$${(Math.round((n / 1000) * 10) / 10).toFixed(1)}k`;
  const breakdown = `${toK(ethUsd)} ETH, ${toK(usdcUsd)} USDC, ${toK(otherUsd + nftNetWorth)} Others`;

  return {
    allocation,
    totalValueUsd: totalUsd,
    breakdown,
  };
}

export function useTreasuryAllocation() {
  return useQuery({
    queryKey: ["treasury-allocation", GNARS_ADDRESSES.treasury],
    queryFn: fetchTreasuryAllocation,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}
