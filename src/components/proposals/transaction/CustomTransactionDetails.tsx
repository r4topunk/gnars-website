"use client";

import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { Link } from "@/i18n/navigation";
import { type TransactionFormValues } from "../schema";

interface CustomTransactionDetailsProps {
  transaction: TransactionFormValues;
}

export function CustomTransactionDetails({ transaction }: CustomTransactionDetailsProps) {
  const t = useTranslations("proposals.txDetails");
  if (transaction.type !== "custom") {
    return null;
  }

  const { target, value, calldata = "0x" } = transaction;

  return (
    <div className="space-y-4">
      {/* Contract Details */}
      <div className="px-3 py-2 rounded-lg bg-background border">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          {t("targetContract")}
        </p>
        {target ? (
          <AddressDisplay
            address={target}
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
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {t("targetNotSpecified")}
            </span>
          </div>
        )}
      </div>

      {/* Technical Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="px-3 py-2 rounded-lg bg-muted/50">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            {t("value")}
          </p>
          <p className="text-sm font-bold font-mono">{value || "0"} ETH</p>
        </div>

        <div className="px-3 py-2 rounded-lg bg-muted/50">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            {t("calldata")}
          </p>
          <p className="text-sm font-mono text-muted-foreground truncate">
            {calldata && calldata !== "0x" ? (
              <Link
                href={`https://calldata.swiss-knife.xyz/decoder?calldata=${calldata}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline"
              >
                {`${calldata.slice(0, 10)}...`}
              </Link>
            ) : (
              "0x"
            )}
          </p>
        </div>
      </div>

      {/* Warning for custom transactions */}
      <div className="px-3 py-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
        <p className="text-xs text-amber-700 dark:text-amber-300">⚡ {t("advancedInteraction")}</p>
      </div>
    </div>
  );
}
