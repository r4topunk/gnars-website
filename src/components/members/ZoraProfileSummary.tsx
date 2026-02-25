"use client";

import { useState } from "react";
import { ExternalLink, Minus, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { FaEthereum } from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useEthPrice, formatEthToUsd } from "@/hooks/use-eth-price";
import { useTradeCreatorCoin } from "@/hooks/use-trade-creator-coin";
import type { ZoraProfile } from "@/hooks/use-zora-profile";

interface ZoraProfileSummaryProps {
  profile?: ZoraProfile | null;
  size?: "sm" | "md";
  loading?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: { avatar: "h-7 w-7", name: "text-sm", meta: "text-xs" },
  md: { avatar: "h-10 w-10", name: "text-base", meta: "text-sm" },
};

function formatMarketCap(marketCap: string | undefined): string {
  if (!marketCap) return "—";
  const num = parseFloat(marketCap);
  if (isNaN(num)) return "—";
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatDelta(delta: string | undefined): { value: string; isPositive: boolean } | null {
  if (!delta) return null;
  const num = parseFloat(delta);
  if (isNaN(num)) return null;
  const percentage = num / 1000;
  return {
    value: `${percentage > 0 ? "+" : ""}${percentage.toFixed(2)}%`,
    isPositive: percentage > 0,
  };
}

export function ZoraProfileSummary({
  profile,
  size = "sm",
  loading = false,
  className,
}: ZoraProfileSummaryProps) {
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [ethAmount, setEthAmount] = useState(0.001);
  const { buyCreatorCoin, isTrading } = useTradeCreatorCoin();
  const { ethPrice } = useEthPrice();

  const styles = sizeStyles[size];
  const hasCreatorCoin = !!profile?.creatorCoin;
  const marketCapFormatted = formatMarketCap(profile?.creatorCoin?.marketCap);
  const deltaInfo = formatDelta(profile?.creatorCoin?.marketCapDelta24h);

  const incrementAmount = () => setEthAmount((prev) => Math.min(prev + 0.001, 10));
  const decrementAmount = () => setEthAmount((prev) => Math.max(prev - 0.001, 0.001));

  const handleBuy = async () => {
    if (!profile?.creatorCoin?.address) return;
    try {
      const success = await buyCreatorCoin({
        creatorCoinAddress: profile.creatorCoin.address,
        amountInEth: ethAmount.toString(),
      });
      if (success) {
        setShowBuyModal(false);
        setEthAmount(0.001);
      }
    } catch (error) {
      console.error("Error in handleBuy:", error);
    }
  };

  if (loading) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>Loading Zora...</div>
    );
  }

  if (!profile) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>Zora: Not linked</div>
    );
  }

  const displayName = profile.displayName || profile.handle;
  const handle = profile.handle ? `@${profile.handle}` : "";
  const avatarSrc = profile.avatar?.medium ?? "";

  return (
    <>
      <div className={cn("flex items-start gap-3", className)}>
        <Avatar className={styles.avatar}>
          <AvatarImage src={avatarSrc} alt={profile.handle || "Zora"} />
          <AvatarFallback className="text-[10px] font-semibold">
            {(profile.handle || "ZO").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {displayName && (
              <span className={cn("font-semibold", styles.name)}>{displayName}</span>
            )}
            {handle && (
              <a
                href={`https://zora.co/${profile.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-colors",
                  styles.meta,
                )}
              >
                {handle}
              </a>
            )}
            {hasCreatorCoin && (
              <Badge
                className="cursor-pointer bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                onClick={() => setShowBuyModal(true)}
              >
                Buy Creator Coin
                <ExternalLink className="ml-1 h-3 w-3" />
              </Badge>
            )}
          </div>
          {hasCreatorCoin ? (
            <div className={cn("mt-1", styles.meta)}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{marketCapFormatted}</span>
                <span>mcap</span>
                {deltaInfo && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5",
                      deltaInfo.isPositive ? "text-green-500" : "text-red-500",
                    )}
                  >
                    {deltaInfo.isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {deltaInfo.value} 24h
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className={cn("mt-1 text-muted-foreground", styles.meta)}>No creator coin</div>
          )}
        </div>
      </div>

      <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buy Creator Coin</DialogTitle>
            <DialogDescription>
              Purchase {profile.displayName || profile.handle || "this creator"}&apos;s token with
              ETH
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="bg-zinc-900 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={decrementAmount}
                  disabled={ethAmount <= 0.001}
                  className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Minus className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold text-white tabular-nums">
                    {ethAmount.toFixed(3)}
                  </span>
                  <div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1.5 rounded-full">
                    <FaEthereum className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium text-sm">ETH</span>
                  </div>
                </div>
                <button
                  onClick={incrementAmount}
                  disabled={ethAmount >= 10}
                  className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{formatEthToUsd(ethAmount, ethPrice)}</span>
                <span className="text-zinc-500 tabular-nums">{ethAmount.toFixed(6)} ETH</span>
              </div>
            </div>
            <div className="flex gap-2">
              {[0.001, 0.005, 0.01, 0.05, 0.1].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setEthAmount(amount)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    ethAmount === amount
                      ? "bg-yellow-500 text-black"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Market Cap: {marketCapFormatted}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowBuyModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleBuy}
                disabled={isTrading || ethAmount <= 0}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              >
                {isTrading ? "Buying..." : "Buy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
