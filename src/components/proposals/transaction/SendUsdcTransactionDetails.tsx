"use client";

import { ArrowRight, AlertCircle } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { type TransactionFormValues } from "../schema";
import { GNARS_ADDRESSES, TREASURY_TOKEN_ALLOWLIST } from "@/lib/config";

interface SendUsdcTransactionDetailsProps {
  transaction: TransactionFormValues;
}

export function SendUsdcTransactionDetails({ transaction }: SendUsdcTransactionDetailsProps) {
  if (transaction.type !== "send-usdc") return null;

  const { recipient, amount } = transaction;
  const tokenAddress = TREASURY_TOKEN_ALLOWLIST.USDC;

  return (
    <div className="space-y-4">
      {/* Transfer Flow Visualization */}
      <div className="flex items-center gap-3">
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
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {amount || "0"} USDC
          </div>
        </div>

        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">To</p>
          {recipient ? (
            <div className="px-3 py-2 rounded-lg bg-background border min-h-[60px] flex items-center">
              <AddressDisplay
                address={recipient}
                variant="compact"
                showAvatar={true}
                showCopy={true}
                showExplorer={false}
                avatarSize="sm"
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

      <div className="px-3 py-2 rounded-lg bg-muted/50">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Token Contract</p>
        <AddressDisplay
          address={tokenAddress}
          variant="compact"
          showAvatar={false}
          showCopy={true}
          showExplorer={false}
          truncateLength={8}
          className="text-sm font-mono"
        />
      </div>
    </div>
  );
}
