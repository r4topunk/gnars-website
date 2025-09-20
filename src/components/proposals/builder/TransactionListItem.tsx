"use client";

import { Edit, Trash2, ArrowRight, AlertCircle } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AddressDisplay } from "@/components/ui/address-display";
import { getETHDisplayProps } from "@/lib/utils";
import { GNARS_ADDRESSES } from "@/lib/config";
import { type TransactionFormValues } from "../schema";
import { cn } from "@/lib/utils";

interface TransactionListItemProps {
  index: number;
  transaction: TransactionFormValues;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onEdit: () => void;
  onRemove: () => void;
}

export function TransactionListItem({
  index,
  transaction,
  label,
  icon: Icon,
  onEdit,
  onRemove,
}: TransactionListItemProps) {

  const typeStyles: Record<
    TransactionFormValues["type"],
    { accent: string; bg: string; border: string; text: string }
  > = {
    "send-eth": {
      accent: "blue",
      bg: "bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
    },
    "send-usdc": {
      accent: "emerald",
      bg: "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-300",
    },
    "send-tokens": {
      accent: "violet",
      bg: "bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20",
      border: "border-violet-200 dark:border-violet-800",
      text: "text-violet-700 dark:text-violet-300",
    },
    "send-nfts": {
      accent: "fuchsia",
      bg: "bg-gradient-to-br from-fuchsia-50 to-pink-50 dark:from-fuchsia-950/20 dark:to-pink-950/20",
      border: "border-fuchsia-200 dark:border-fuchsia-800",
      text: "text-fuchsia-700 dark:text-fuchsia-300",
    },
    droposal: {
      accent: "amber",
      bg: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-300",
    },
    custom: {
      accent: "slate",
      bg: "bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20",
      border: "border-slate-200 dark:border-slate-800",
      text: "text-slate-700 dark:text-slate-300",
    },
  } as const;

  const styles = typeStyles[transaction.type] || typeStyles.custom;

  const details = (() => {
    switch (transaction.type) {
      case "send-eth":
        const ethProps = transaction.value ? getETHDisplayProps(transaction.value) : null;
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
                {transaction.target ? (
                  <div className="px-3 py-2 rounded-lg bg-background border min-h-[60px] flex items-center">
                    <AddressDisplay
                      address={transaction.target}
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
      case "send-usdc":
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
                  {transaction.amount || "0"} USDC
                </div>
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
      case "send-tokens":
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
      case "send-nfts":
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
      case "custom":
        return (
          <div className="space-y-4">
            {/* Contract Details */}
            <div className="px-3 py-2 rounded-lg bg-background border">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Target Contract</p>
              {transaction.target ? (
                <AddressDisplay
                  address={transaction.target}
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
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Target not specified</span>
                </div>
              )}
            </div>

            {/* Technical Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="px-3 py-2 rounded-lg bg-muted/50">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Value</p>
                <p className="text-sm font-bold font-mono">
                  {transaction.value || "0"} ETH
                </p>
              </div>

              <div className="px-3 py-2 rounded-lg bg-muted/50">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Calldata</p>
                <p className="text-sm font-mono text-muted-foreground truncate">
                  {transaction.calldata ? `${transaction.calldata.slice(0, 10)}...` : "0x"}
                </p>
              </div>
            </div>

            {/* Warning for custom transactions */}
            <div className="px-3 py-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
              <p className="text-xs text-amber-700 dark:text-amber-300">⚡ Advanced contract interaction</p>
            </div>
          </div>
        );
      case "droposal":
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
      default:
        return null;
    }
  })();

  return (
    <Card className={cn(
      "relative overflow-hidden",
      styles.border
    )}>
        {/* Subtle gradient background based on type */}
        <div className={cn(
          "absolute inset-0 opacity-[0.03]",
          styles.bg
        )} />

        <CardHeader className="relative">
          <div className="flex items-start justify-between gap-4">
            {/* Left section with icon and main info */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Type Icon with gradient background */}
              <div className={cn(
                "p-2.5 rounded-xl",
                styles.bg,
                "border",
                styles.border
              )}>
                <Icon className={cn("h-5 w-5", styles.text)} />
              </div>

              {/* Transaction Info */}
              <div className="flex-1 space-y-2">
                {/* Header with number and type badge */}
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Tx #{index + 1}
                  </h3>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs font-medium px-2 py-0.5",
                      styles.text,
                      "bg-opacity-10 border-0"
                    )}
                  >
                    {label}
                  </Badge>
                </div>

                {/* Description */}
                {transaction.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed pr-4">
                    {transaction.description}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={onEdit}
                className={cn(
                  "h-8 w-8 transition-all duration-200",
                  "hover:bg-blue-50 dark:hover:bg-blue-950/30",
                  "hover:text-blue-600 dark:hover:text-blue-400"
                )}
              >
                <Edit className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={onRemove}
                className={cn(
                  "h-8 w-8 transition-all duration-200",
                  "hover:bg-red-50 dark:hover:bg-red-950/30",
                  "hover:text-red-600 dark:hover:text-red-400"
                )}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Transaction Details */}
        <CardContent className="relative pt-0">
          <div className="rounded-lg bg-muted/30 p-4">
            {details}
          </div>
        </CardContent>
    </Card>
  );
}
