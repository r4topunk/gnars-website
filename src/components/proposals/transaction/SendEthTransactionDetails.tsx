"use client";

import { ArrowRight, AlertCircle } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { getETHDisplayProps } from "@/lib/utils";
import { GNARS_ADDRESSES } from "@/lib/config";
import { type TransactionFormValues } from "../schema";
import { cn } from "@/lib/utils";

interface SendEthTransactionDetailsProps {
  transaction: TransactionFormValues;
}

export function SendEthTransactionDetails({ transaction }: SendEthTransactionDetailsProps) {
  if (transaction.type !== "send-eth") return null;

  const { target, value } = transaction;
  const ethProps = value ? getETHDisplayProps(value) : null;

  return (
    <div className="space-y-4">
      {/* Transfer Flow Visualization */}
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
          <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90 md:rotate-0" />
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
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">To</p>
          {target ? (
            <div className="px-3 py-2 rounded-lg bg-background border min-h-[60px] flex items-center">
              <AddressDisplay
                address={target}
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
