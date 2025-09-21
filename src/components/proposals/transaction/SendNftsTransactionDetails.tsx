"use client";

import { ArrowRight, AlertCircle } from "lucide-react";
import Image from "next/image";
import { AddressDisplay } from "@/components/ui/address-display";
import { type TransactionFormValues } from "../schema";

interface SendNftsTransactionDetailsProps {
  transaction: TransactionFormValues;
}

export function SendNftsTransactionDetails({ transaction }: SendNftsTransactionDetailsProps) {
  return (
    <div className="space-y-4">
      {/* NFT Display */}
      {transaction.nftImage && (
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border">
            <Image
              src={transaction.nftImage}
              alt={`Gnar #${transaction.tokenId}`}
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div>
            <p className="text-sm font-semibold">Gnar #{transaction.tokenId}</p>
            <p className="text-xs text-muted-foreground">Gnars NFT Collection</p>
          </div>
        </div>
      )}

      {/* Transfer Flow */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">From</p>
          <div className="px-3 py-2 rounded-lg bg-background border min-h-[60px] flex items-center">
            <div>
              <p className="text-sm font-medium">DAO Treasury</p>
              <p className="text-xs text-muted-foreground font-mono">
                {transaction.from ? transaction.from.slice(0, 6) + "..." + transaction.from.slice(-4) : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="text-xs text-muted-foreground mt-1">NFT</div>
        </div>

        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">To</p>
          {transaction.to ? (
            <div className="px-3 py-2 rounded-lg bg-background border min-h-[60px] flex items-center">
              <AddressDisplay
                address={transaction.to}
                variant="compact"
                showAvatar={true}
                showCopy={false}
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
