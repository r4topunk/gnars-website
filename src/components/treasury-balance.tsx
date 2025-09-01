"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import { TREASURY_TOKEN_ADDRESSES } from "@/lib/config";
import { fetchTotalAuctionSalesWei } from "@/services/dao";

interface TreasuryBalanceProps {
  treasuryAddress: string;
  metric?: "total" | "eth" | "auctions";
}

interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  decimals?: number;
  symbol?: string;
  name?: string;
  logo?: string;
}

interface AlchemyTokenResponse {
  result?: {
    address: string;
    tokenBalances: TokenBalance[];
  };
}

interface NftItem {
  tokenId: string;
  tokenType: string;
  name?: string;
  description?: string;
  image?: {
    originalUrl?: string;
    thumbnailUrl?: string;
  };
  contract: {
    address: string;
    name?: string;
    symbol?: string;
  };
}

interface AlchemyNftResponse {
  result?: {
    ownedNfts: NftItem[];
    totalCount: number;
  };
}

export function TreasuryBalance({ treasuryAddress, metric = "total" }: TreasuryBalanceProps) {
  const [ethBalance, setEthBalance] = useState<bigint | null>(null);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [nfts, setNfts] = useState<NftItem[]>([]);
  const [totalAuctionSalesWei, setTotalAuctionSalesWei] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTreasuryData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch ETH balance
      const ethResponse = await fetch("/api/alchemy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "eth_getBalance",
          params: [treasuryAddress, "latest"],
        }),
      });

      if (!ethResponse.ok) {
        throw new Error("Failed to fetch ETH balance");
      }

      const ethData = await ethResponse.json();
      const ethBal = BigInt(ethData.result || "0");
      setEthBalance(ethBal);

      // Fetch token balances (restricted to allowlist)
      const tokenResponse = await fetch("/api/alchemy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "alchemy_getTokenBalances",
          params: [treasuryAddress, TREASURY_TOKEN_ADDRESSES.filter(Boolean)],
        }),
      });

      if (tokenResponse.ok) {
        const tokenData: AlchemyTokenResponse = await tokenResponse.json();
        // Filter out zero balances
        const nonZeroTokens = (tokenData.result?.tokenBalances || []).filter(
          (token: TokenBalance) => token.tokenBalance !== "0x0" && token.tokenBalance !== "0",
        );
        setTokens(nonZeroTokens);
      }

      // Fetch total auction sales from subgraph
      try {
        const salesWei = await fetchTotalAuctionSalesWei();
        setTotalAuctionSalesWei(salesWei);
      } catch {
        setTotalAuctionSalesWei(0n);
      }

      // Fetch NFTs
      const nftResponse = await fetch("/api/alchemy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "alchemy_getNfts",
          params: [treasuryAddress],
        }),
      });

      if (nftResponse.ok) {
        const nftData: AlchemyNftResponse = await nftResponse.json();
        setNfts(nftData.result?.ownedNfts || []);
      }
    } catch (err) {
      console.error("Error fetching treasury data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch treasury data");
    } finally {
      setIsLoading(false);
    }
  }, [treasuryAddress]);

  useEffect(() => {
    fetchTreasuryData();
  }, [fetchTreasuryData]);

  const formatCurrency = (amount: number, currency: "USD" | "ETH" = "USD") => {
    if (currency === "ETH") {
      return (
        new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        }).format(amount) + " ETH"
      );
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-destructive">Error: {error}</div>;
  }

  const renderMetric = () => {
    switch (metric) {
      case "eth":
        if (ethBalance === null) return formatCurrency(0, "ETH");
        const ethAmount = Number(formatEther(ethBalance));
        return formatCurrency(ethAmount, "ETH");

      case "auctions":
        if (totalAuctionSalesWei === null) return formatCurrency(0, "ETH");
        try {
          const salesEth = Number(formatEther(totalAuctionSalesWei));
          return formatCurrency(salesEth, "ETH");
        } catch {
          return formatCurrency(0, "ETH");
        }

      case "total":
      default:
        // Placeholder calculation - in real implementation, you'd calculate based on current prices
        const ethValue = ethBalance ? Number(formatEther(ethBalance)) : 0;
        const estimatedUsdValue = ethValue * 2500; // Placeholder ETH price
        return formatCurrency(estimatedUsdValue);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-3xl font-bold tabular-nums">{renderMetric()}</div>
      {metric === "total" && (
        <div className="text-sm text-muted-foreground">
          {tokens.length} tokens • {nfts.length} NFTs
        </div>
      )}
      {metric === "auctions" && (
        <div className="text-sm text-muted-foreground">Cumulative ETH from settled auctions</div>
      )}
    </div>
  );
}
