"use client";

import { ArrowLeftRight, AlertCircle } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { getETHDisplayProps } from "@/lib/utils";
import { GNARS_ADDRESSES } from "@/lib/config";
import { type TransactionFormValues } from "../schema";
import { cn } from "@/lib/utils";

interface BuyCoinTransactionDetailsProps {
  transaction: TransactionFormValues;
}

export function BuyCoinTransactionDetails({ transaction }: BuyCoinTransactionDetailsProps) {
  if (transaction.type !== "buy-coin") return null;

  const { coinAddress, ethAmount, slippage, target, calldata } = transaction;
  const ethProps = ethAmount ? getETHDisplayProps(ethAmount) : null;
  const isGenerated = target && calldata;

  return (
    <div className="space-y-4">
      {/* Coin Purchase Flow Visualization */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">From</p>
          <div className="px-3 py-2 rounded-lg bg-background border min-h-[60px] flex items-center">
            <div>
              <p className="text-sm font-medium">DAO Treasury</p>
              <p className="text-xs text-muted-foreground font-mono">
                {GNARS_ADDRESSES.treasury.slice(0, 6)}...{GNARS_ADDRESSES.treasury.slice(-4)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground rotate-90 md:rotate-0" />
          {ethProps && (
            <div className={cn(
              "text-sm font-bold font-mono mt-1",
              ethProps.textColor
            )}>
              {ethProps.formatted}
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Buy Coin</p>
          {coinAddress ? (
            <div className="px-3 py-2 rounded-lg bg-background border min-h-[60px] flex items-center justify-between">
              <AddressDisplay
                address={coinAddress}
                variant="compact"
                showAvatar={false}
                showCopy={true}
                showExplorer={true}
                truncateLength={6}
                className="text-sm font-medium"
              />
            </div>
          ) : (
            <div className="px-3 py-2 rounded-lg border border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 min-h-[60px] flex items-center">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Not set</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trade Details */}
      <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Max Slippage</p>
          <p className="text-sm font-medium">{slippage || "0"}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Recipient</p>
          <p className="text-sm font-medium">DAO Treasury</p>
        </div>
      </div>

      {/* SDK Status */}
      {!isGenerated && (
        <div className="px-3 py-2 rounded-lg border border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                Transaction Data Pending
              </p>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                Router calldata will be generated from Zora SDK when you save this transaction
              </p>
            </div>
          </div>
        </div>
      )}

      {isGenerated && (
        <div className="px-3 py-2 rounded-lg border border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                Ready to Execute
              </p>
              <p className="text-xs text-green-600/80 dark:text-green-400/80">
                Router transaction generated via Zora Coins SDK
              </p>
              {target && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Router Address:</p>
                  <p className="text-xs font-mono text-green-600 dark:text-green-400">
                    {target.slice(0, 10)}...{target.slice(-8)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
