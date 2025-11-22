"use client";

import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink } from "lucide-react";

export interface ZoraCoin {
  id: string;
  address: string;
  name: string;
  symbol: string;
  chainId: number;
  balance: number;
  balanceRaw: string;
  usdValue: number;
  marketCap: number;
  volume24h: number;
  image?: string;
  creatorAddress?: string;
  creatorName?: string;
}

interface ZoraCoinHoldingsClientProps {
  coins: ZoraCoin[];
  error?: string;
}

function formatNumber(value: number, decimals: number = 2): string {
  if (value === 0) return "0";
  if (value < 0.01) return "<0.01";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatUSD(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactNumber(value: number): string {
  if (value === 0) return "0";
  if (value < 1000) return formatNumber(value);
  if (value < 1_000_000) return `${formatNumber(value / 1000, 1)}K`;
  if (value < 1_000_000_000) return `${formatNumber(value / 1_000_000, 1)}M`;
  return `${formatNumber(value / 1_000_000_000, 1)}B`;
}

export function ZoraCoinHoldingsClient({ coins, error }: ZoraCoinHoldingsClientProps) {
  const totalValue = coins.reduce((sum, coin) => sum + coin.usdValue, 0);

  // Log coin images for debugging
  console.log("Frontend coins:", coins.map(c => ({ name: c.name, image: c.image })));

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zora Coins</CardTitle>
          <CardDescription>Zora coins held in the treasury</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (coins.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Zora Coins</CardTitle>
          <CardDescription>Zora coins held in the treasury</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No Zora coins found in treasury</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zora Coins</CardTitle>
        <CardDescription>
          {coins.length} {coins.length === 1 ? "coin" : "coins"} · Total value: {formatUSD(totalValue)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coin</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Value (USD)</TableHead>
                <TableHead className="text-right">Market Cap</TableHead>
                <TableHead className="text-right">24h Volume</TableHead>
                <TableHead className="text-right">Creator</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coins.map((coin) => (
                <TableRow key={coin.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {coin.image ? (
                        <div className="relative h-8 w-8 overflow-hidden rounded-full bg-muted">
                          <Image
                            src={coin.image}
                            alt={coin.name}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                          {coin.symbol.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{coin.name}</div>
                        <div className="text-sm text-muted-foreground">{coin.symbol}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCompactNumber(coin.balance)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatUSD(coin.usdValue)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatUSD(coin.marketCap)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatUSD(coin.volume24h)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {coin.creatorName || (coin.creatorAddress ? `${coin.creatorAddress.slice(0, 6)}...${coin.creatorAddress.slice(-4)}` : "—")}
                  </TableCell>
                  <TableCell className="text-right">
                    <a
                      href={`https://zora.co/collect/base:${coin.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
