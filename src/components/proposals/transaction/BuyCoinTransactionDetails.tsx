"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, ArrowLeftRight } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { DAO_ADDRESSES } from "@/lib/config";
import { cn, getETHDisplayProps } from "@/lib/utils";
import { type TransactionFormValues } from "../schema";

interface BuyCoinTransactionDetailsProps {
  transaction: TransactionFormValues;
}

export function BuyCoinTransactionDetails({ transaction }: BuyCoinTransactionDetailsProps) {
  const t = useTranslations("proposals.txDetails");
  if (transaction.type !== "buy-coin") return null;

  const { coinAddress, ethAmount, slippage, target, calldata } = transaction;
  const ethProps = ethAmount ? getETHDisplayProps(ethAmount) : null;
  const isGenerated = target && calldata;

  return (
    <div className="space-y-4">
      {/* Coin Purchase Flow Visualization */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("from")}</p>
          <div className="px-3 py-2 rounded-lg bg-background border min-h-[60px] flex items-center">
            <div>
              <p className="text-sm font-medium">{t("daoTreasury")}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {DAO_ADDRESSES.treasury.slice(0, 6)}...{DAO_ADDRESSES.treasury.slice(-4)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground rotate-90 md:rotate-0" />
          {ethProps && (
            <div className={cn("text-sm font-bold font-mono mt-1", ethProps.textColor)}>
              {ethProps.formatted}
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            {t("buyCoinLabel")}
          </p>
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
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {t("notSet")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trade Details */}
      <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{t("maxSlippage")}</p>
          <p className="text-sm font-medium">{slippage || "0"}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">{t("recipient")}</p>
          <p className="text-sm font-medium">{t("daoTreasury")}</p>
        </div>
      </div>

      {/* SDK Status */}
      {!isGenerated && (
        <div className="px-3 py-2 rounded-lg border border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                {t("txDataPending")}
              </p>
              <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                {t("txDataPendingDesc")}
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
                {t("readyToExecute")}
              </p>
              <p className="text-xs text-green-600/80 dark:text-green-400/80">
                {t("readyToExecuteDesc")}
              </p>
              {target && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">{t("routerAddress")}</p>
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
