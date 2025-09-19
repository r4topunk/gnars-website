"use client";

import { Edit, Trash2, Image as ImageIcon, Settings, Zap, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { AddressDisplay } from "@/components/ui/address-display";
import { formatETH, getETHDisplayProps } from "@/lib/utils";
import { type TransactionFormValues } from "../schema";

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
    { iconBg: string; iconText: string; cardBorder: string; badgeClass: string }
  > = {
    "send-eth": {
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconText: "text-blue-600 dark:text-blue-400",
      cardBorder: "",
      badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700",
    },
    "send-usdc": {
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconText: "text-emerald-600 dark:text-emerald-400",
      cardBorder: "",
      badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
    },
    "send-tokens": {
      iconBg: "bg-violet-100 dark:bg-violet-900/30",
      iconText: "text-violet-600 dark:text-violet-400",
      cardBorder: "",
      badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 border-violet-300 dark:border-violet-700",
    },
    "send-nfts": {
      iconBg: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
      iconText: "text-fuchsia-600 dark:text-fuchsia-400",
      cardBorder: "",
      badgeClass: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-300 border-fuchsia-300 dark:border-fuchsia-700",
    },
    droposal: {
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconText: "text-amber-600 dark:text-amber-400",
      cardBorder: "",
      badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700",
    },
    custom: {
      iconBg: "bg-slate-100 dark:bg-slate-900/30",
      iconText: "text-slate-600 dark:text-slate-300",
      cardBorder: "",
      badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border-slate-300 dark:border-slate-700",
    },
  } as const;

  const styles = typeStyles[transaction.type] || typeStyles.custom;

  const details = (() => {
    switch (transaction.type) {
      case "send-eth":
        const ethProps = getETHDisplayProps(transaction.value);
        return (
          <Card className="border-0 bg-muted/50">
            <CardContent className="space-y-3">
            {/* Amount Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
              <span className="text-sm font-medium text-muted-foreground">Amount</span>
              <div className="text-left sm:text-right">
                <div className={`text-lg sm:text-xl font-bold font-mono ${ethProps.textColor}`}>
                  {ethProps.formatted}
                </div>
                {ethProps.isSignificant && (
                  <div className="text-xs text-muted-foreground">
                    {ethProps.isLarge ? "High Value" : "Standard Transfer"}
                  </div>
                )}
              </div>
            </div>

            {/* Recipient Section */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Recipient</span>
              <div>
                {transaction.target ? (
                  <AddressDisplay
                    address={transaction.target}
                    variant="compact"
                    showAvatar={true}
                    showCopy={true}
                    showExplorer={true}
                    avatarSize="sm"
                    truncateLength={6}
                    className="text-sm"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-sm font-medium">Address not configured</span>
                  </div>
                )}
              </div>
            </div>
            </CardContent>
          </Card>
        );
      case "send-usdc":
        return (
          <Card className="border-0 bg-muted/50">
            <CardContent className="space-y-3">
            {/* Amount Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
              <span className="text-sm font-medium text-muted-foreground">Amount</span>
              <div className="text-left sm:text-right">
                <div className="text-lg sm:text-xl font-bold font-mono text-foreground">
                  {transaction.amount ? `${transaction.amount} USDC` : "0 USDC"}
                </div>
                <div className="text-xs text-muted-foreground">Stablecoin Transfer</div>
              </div>
            </div>

            {/* Recipient Section */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Recipient</span>
              <div>
                {transaction.recipient ? (
                  <AddressDisplay
                    address={transaction.recipient}
                    variant="compact"
                    showAvatar={true}
                    showCopy={true}
                    showExplorer={true}
                    avatarSize="sm"
                    truncateLength={6}
                    className="text-sm"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-sm font-medium">Address not configured</span>
                  </div>
                )}
              </div>
            </div>
            </CardContent>
          </Card>
        );
      case "send-tokens":
        return (
          <Card className="border-0 bg-muted/50">
            <CardContent className="space-y-3">
            {/* Token Contract Section */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Token Contract</span>
              <div>
                {transaction.tokenAddress ? (
                  <AddressDisplay
                    address={transaction.tokenAddress}
                    variant="compact"
                    showAvatar={false}
                    showCopy={true}
                    showExplorer={true}
                    truncateLength={6}
                    className="text-sm"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-sm font-medium">Token not configured</span>
                  </div>
                )}
              </div>
            </div>

            {/* Amount Section */}
            {transaction.amount && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <span className="text-sm font-medium text-muted-foreground">Amount</span>
                <div className="text-left sm:text-right">
                  <div className="text-lg sm:text-xl font-bold font-mono text-foreground">
                    {transaction.amount}
                  </div>
                </div>
              </div>
            )}

            {/* Recipient Section */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Recipient</span>
              <div>
                {transaction.recipient ? (
                  <AddressDisplay
                    address={transaction.recipient}
                    variant="compact"
                    showAvatar={true}
                    showCopy={true}
                    showExplorer={true}
                    avatarSize="sm"
                    truncateLength={6}
                    className="text-sm"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-sm font-medium">Address not configured</span>
                  </div>
                )}
              </div>
            </div>
            </CardContent>
          </Card>
        );
      case "send-nfts":
        return (
          <Card className="border-0 bg-muted/50">
            <CardContent className="space-y-3">
            {/* NFT Contract Section */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">NFT Contract</span>
              <div>
                {transaction.contractAddress ? (
                  <AddressDisplay
                    address={transaction.contractAddress}
                    variant="compact"
                    showAvatar={false}
                    showCopy={true}
                    showExplorer={true}
                    truncateLength={6}
                    className="text-sm"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-sm font-medium">Contract not configured</span>
                  </div>
                )}
              </div>
            </div>

            {/* Token ID Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
              <span className="text-sm font-medium text-muted-foreground">Token ID</span>
              <div className="text-left sm:text-right">
                <div className="text-lg font-bold font-mono text-foreground">
                  #{transaction.tokenId || "Not set"}
                </div>
              </div>
            </div>

            {/* Transfer Section */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Transfer Details</span>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">From</div>
                  {transaction.from ? (
                    <AddressDisplay
                      address={transaction.from}
                      variant="compact"
                      showAvatar={true}
                      showCopy={true}
                      showExplorer={true}
                      avatarSize="sm"
                      truncateLength={6}
                      className="text-sm"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-sm font-medium">From address not set</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">To</div>
                  {transaction.to ? (
                    <AddressDisplay
                      address={transaction.to}
                      variant="compact"
                      showAvatar={true}
                      showCopy={true}
                      showExplorer={true}
                      avatarSize="sm"
                      truncateLength={6}
                      className="text-sm"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-sm font-medium">To address not set</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
        );
      case "custom":
        return (
          <Card className="border-0 bg-muted/50">
            <CardContent className="space-y-3">
            {/* Target Contract Section */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Target Contract</span>
              <div>
                {transaction.target ? (
                  <AddressDisplay
                    address={transaction.target}
                    variant="compact"
                    showAvatar={false}
                    showCopy={true}
                    showExplorer={true}
                    truncateLength={6}
                    className="text-sm"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-sm font-medium">Target not configured</span>
                  </div>
                )}
              </div>
            </div>

            {/* Value Section */}
            {transaction.value && transaction.value !== "0" && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <span className="text-sm font-medium text-muted-foreground">Value</span>
                <div className="text-left sm:text-right">
                  <div className="text-lg font-bold font-mono text-foreground">
                    {transaction.value} ETH
                  </div>
                </div>
              </div>
            )}

            {/* Calldata Section */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Calldata</span>
              <div>
                <div className="p-2 bg-muted rounded-lg">
                  <code className="text-xs text-muted-foreground break-all">
                    {transaction.calldata || "0x"}
                  </code>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
        );
      case "droposal":
        return (
          <Card className="border-0 bg-muted/50">
            <CardContent className="space-y-3 p-4">
            {/* Collection Details Section */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Collection Details</span>
            </div>

            {/* Name & Symbol */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <span className="text-sm text-muted-foreground">Name</span>
                <div className="text-base font-semibold">
                  {transaction.name || "Not configured"}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <span className="text-sm text-muted-foreground">Symbol</span>
                <div className="text-base font-semibold font-mono">
                  {transaction.symbol || "Not set"}
                </div>
              </div>
            </div>

            {/* Price Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
              <span className="text-sm font-medium text-muted-foreground">Mint Price</span>
              <div className="text-left sm:text-right">
                <div className="text-lg font-bold font-mono text-foreground">
                  {transaction.price || "0"} ETH
                </div>
                <div className="text-xs text-muted-foreground">Per NFT</div>
              </div>
            </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  })();

  return (
    <TooltipProvider>
      <Card className={`transition-all duration-200 hover:shadow-md hover:shadow-blue-100/40 dark:hover:shadow-blue-900/20 ${styles.cardBorder} group`}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-0">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 sm:p-3 rounded-xl transition-all duration-200 group-hover:scale-105 ${styles.iconBg}`}>
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${styles.iconText}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                  <span className="text-base font-semibold">Transaction {index + 1}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs px-2 py-1 font-medium w-fit border ${styles.badgeClass}`}
                  >
                    {label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  {transaction.description || "No description provided"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:ml-4 self-start">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onEdit}
                    className="transition-all duration-200 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950 dark:hover:border-blue-800 flex-1 sm:flex-none"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="ml-2 sm:hidden">Edit</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Edit transaction</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRemove}
                    className="transition-all duration-200 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 flex-1 sm:flex-none"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="ml-2 sm:hidden">Remove</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Remove transaction</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {details}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
