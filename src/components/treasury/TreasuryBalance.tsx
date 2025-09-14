"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { CountUp } from "@/components/ui/count-up";
import { Skeleton } from "@/components/ui/skeleton";
import { TREASURY_TOKEN_ADDRESSES, TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";
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

export function TreasuryBalance({ treasuryAddress, metric = "total" }: TreasuryBalanceProps) {
  const [ethBalance, setEthBalance] = useState<bigint | null>(null);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [tokenUsdMap, setTokenUsdMap] = useState<Record<string, number>>({});
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

        // Load USD prices for allowlisted tokens
        try {
          // Always request prices for the full allowlist so we can price native ETH via WETH
          const addresses = TREASURY_TOKEN_ADDRESSES.map((a) => String(a).toLowerCase());
          const priceRes = await fetch("/api/prices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ addresses }),
          });
          if (priceRes.ok) {
            const priceJson = await priceRes.json();
            const prices: Record<string, { usd?: number }> = priceJson?.prices ?? {};
            const map: Record<string, number> = {};
            for (const [addr, p] of Object.entries(prices)) {
              map[addr.toLowerCase()] = Number(p?.usd ?? 0) || 0;
            }
            setTokenUsdMap(map);
          }
        } catch {
          setTokenUsdMap({});
        }
      }

      // Fetch total auction sales from subgraph
      try {
        const salesWei = await fetchTotalAuctionSalesWei();
        setTotalAuctionSalesWei(salesWei);
      } catch {
        setTotalAuctionSalesWei(BigInt(0));
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

  const totalUsdFromTokens = useMemo(() => {
    // compute USD value using token balances and price map
    let sum = 0;
    for (const t of tokens) {
      const price = tokenUsdMap[String(t.contractAddress).toLowerCase()] ?? 0;
      const decimals = Number(t.decimals ?? 18);
      const balance = parseInt(String(t.tokenBalance), 16) / Math.pow(10, decimals);
      sum += balance * price;
    }
    // Add native ETH priced using WETH price
    const wethAddress = String(TREASURY_TOKEN_ALLOWLIST.WETH).toLowerCase();
    const ethPrice = tokenUsdMap[wethAddress] ?? 0;
    const ethAmount = ethBalance ? Number(formatEther(ethBalance)) : 0;
    sum += ethAmount * ethPrice;
    return sum;
  }, [tokens, tokenUsdMap, ethBalance]);

  if (isLoading) {
    return <Skeleton className="h-8 w-40" />;
  }

  if (error) {
    return <div className="text-sm text-destructive">Error: {error}</div>;
  }

  const renderMetric = () => {
    switch (metric) {
      case "eth":
        if (ethBalance === null) return formatCurrency(0, "ETH");
        const ethAmount = Number(formatEther(ethBalance));
        return (
          <>
            <CountUp value={ethAmount} decimals={4} className="tabular-nums" /> ETH
          </>
        );

      case "auctions":
        if (totalAuctionSalesWei === null) return formatCurrency(0, "ETH");
        try {
          const salesEth = Number(formatEther(totalAuctionSalesWei));
          return (
            <>
              <CountUp value={salesEth} decimals={4} className="tabular-nums" /> ETH
            </>
          );
        } catch {
          return formatCurrency(0, "ETH");
        }

      case "total":
      default:
        const usd = totalUsdFromTokens;
        return (
          <>
            $<CountUp value={usd} decimals={2} className="tabular-nums" />
          </>
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-3xl font-bold">{renderMetric()}</div>
    </div>
  );
}
