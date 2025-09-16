"use client";

import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface EnrichedToken {
  contractAddress: string;
  balance: number;
  decimals: number;
  symbol: string;
  name: string;
  logo?: string;
  usdValue: number;
}

interface TokenHoldingsClientProps {
  tokens: EnrichedToken[];
  error?: string | null;
}

export function TokenHoldingsClient({ tokens, error }: TokenHoldingsClientProps) {
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

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">Error loading token holdings: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!tokens.length) {
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
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
