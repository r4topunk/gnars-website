"use client";

import { Badge } from "@/components/ui/badge";
import { type TransactionFormValues } from "../schema";

interface DroposalTransactionDetailsProps {
  transaction: TransactionFormValues;
}

export function DroposalTransactionDetails({ transaction }: DroposalTransactionDetailsProps) {
  return (
    <div className="space-y-4">
      {/* Collection Info Card */}
      <div className="px-4 py-3 rounded-lg bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/50">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">NFT Collection</p>
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-0">
              Zora Drop
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-semibold">
                {transaction.name || "Not configured"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Symbol</span>
              <span className="text-sm font-mono font-semibold">
                {transaction.symbol || "Not set"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mint Price Highlight */}
      <div className="px-3 py-2 rounded-lg bg-background border text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Mint Price</p>
        <p className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
          {transaction.price || "0"} ETH
        </p>
        <p className="text-xs text-muted-foreground">per NFT</p>
      </div>
    </div>
  );
}
