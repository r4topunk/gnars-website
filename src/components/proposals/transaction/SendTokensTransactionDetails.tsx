"use client";

import { ArrowRight, AlertCircle } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { type TransactionFormValues } from "../schema";

interface SendTokensTransactionDetailsProps {
  transaction: TransactionFormValues;
}

export function SendTokensTransactionDetails({ transaction }: SendTokensTransactionDetailsProps) {
  return (
    <div className="space-y-4">
      {/* Token Info */}
      <div className="px-3 py-2 rounded-lg bg-background border">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Token Contract</p>
        {transaction.tokenAddress ? (
          <AddressDisplay
            address={transaction.tokenAddress}
            variant="compact"
            showAvatar={false}
            showCopy={true}
            showExplorer={false}
            truncateLength={8}
            className="text-sm font-mono"
          />
        ) : (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Token not specified</span>
          </div>
        )}
      </div>

      {/* Transfer Flow */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">From</p>
          <div className="px-3 py-2 rounded-lg bg-background border min-h-[60px] flex items-center">
            <p className="text-sm font-medium">DAO Treasury</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          {transaction.amount && (
            <div className="text-sm font-bold font-mono text-violet-600 dark:text-violet-400 mt-1">
              {transaction.amount}
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">To</p>
          {transaction.recipient ? (
            <div className="px-3 py-2 rounded-lg bg-background border min-h-[60px] flex items-center">
              <AddressDisplay
                address={transaction.recipient}
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
    </div>
  );
}
