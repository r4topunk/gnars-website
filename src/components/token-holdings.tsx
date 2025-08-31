"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TokenHoldingsProps {
  treasuryAddress: string;
}

interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  decimals?: number;
  symbol?: string;
  name?: string;
  logo?: string;
}

interface TokenMetadata {
  decimals: number;
  logo?: string;
  name?: string;
  symbol?: string;
}

interface EnrichedToken {
  contractAddress: string;
  balance: number;
  balanceRaw: string;
  decimals: number;
  symbol: string;
  name: string;
  logo?: string;
  usdValue: number; // Placeholder for now
}

export function TokenHoldings({ treasuryAddress }: TokenHoldingsProps) {
  const [tokens, setTokens] = useState<EnrichedToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokenHoldings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch token balances using Alchemy API
      const response = await fetch("/api/alchemy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "alchemy_getTokenBalances",
          params: [treasuryAddress],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch token balances");
      }

      const data = await response.json();
      const tokenBalances: TokenBalance[] = data.result?.tokenBalances || [];

      // Filter out zero balances
      const nonZeroTokens = tokenBalances.filter(
        (token) => token.tokenBalance !== "0x0" && token.tokenBalance !== "0",
      );

      if (nonZeroTokens.length === 0) {
        setTokens([]);
        return;
      }

      // Fetch metadata for each token
      const enrichedTokens: EnrichedToken[] = [];

      for (const token of nonZeroTokens) {
        try {
          // Fetch token metadata
          const metadataResponse = await fetch("/api/alchemy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method: "alchemy_getTokenMetadata",
              params: [token.contractAddress],
            }),
          });

          if (metadataResponse.ok) {
            const metadataData = await metadataResponse.json();
            const metadata: TokenMetadata = metadataData.result;

            if (metadata.decimals !== undefined && metadata.name && metadata.symbol) {
              const balance = parseInt(token.tokenBalance, 16) / Math.pow(10, metadata.decimals);

              enrichedTokens.push({
                contractAddress: token.contractAddress,
                balance,
                balanceRaw: token.tokenBalance,
                decimals: metadata.decimals,
                symbol: metadata.symbol,
                name: metadata.name,
                logo: metadata.logo,
                usdValue: 0, // Placeholder - would need price API integration
              });
            }
          }
        } catch (tokenError) {
          console.error(`Error fetching metadata for token ${token.contractAddress}:`, tokenError);
          // Continue with next token
        }
      }

      setTokens(enrichedTokens);
    } catch (err) {
      console.error("Error fetching token holdings:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch token holdings");
    } finally {
      setIsLoading(false);
    }
  }, [treasuryAddress]);

  useEffect(() => {
    fetchTokenHoldings();
  }, [fetchTokenHoldings]);

  const formatBalance = (balance: number, decimals: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals > 6 ? 2 : Math.min(decimals, 4),
      maximumFractionDigits: decimals > 6 ? 2 : Math.min(decimals, 4),
    }).format(balance);
  };

  const formatUsdValue = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">Error loading token holdings: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <div className="text-lg font-medium mb-2">No tokens found</div>
            <div className="text-sm">The treasury currently holds no ERC-20 tokens</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Holdings</CardTitle>
        <CardDescription>ERC-20 tokens held in the treasury</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Value (USD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((token) => (
              <TableRow key={token.contractAddress}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    {token.logo && (
                      <Image
                        src={token.logo}
                        alt={token.symbol}
                        width={24}
                        height={24}
                        className="rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <div>
                      <div className="font-medium">{token.name}</div>
                      <div className="text-sm text-muted-foreground">{token.symbol}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBalance(token.balance, token.decimals)} {token.symbol}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUsdValue(token.usdValue)}
                  <div className="text-xs text-muted-foreground">Price data needed</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
