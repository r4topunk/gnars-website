"use client";

import { useState } from "react";
import { ExternalLink, TrendingDown, TrendingUp, Minus, Plus } from "lucide-react";
import { FaEthereum } from "react-icons/fa";
import { AddressDisplay } from "@/components/ui/address-display";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTradeCreatorCoin } from "@/hooks/use-trade-creator-coin";
import { useEthPrice, formatEthToUsd } from "@/hooks/use-eth-price";
import type { ZoraProfile } from "@/hooks/use-zora-profile";

interface OverviewLike {
  tokenCount: number;
  tokensHeld: number[];
  delegate: string;
}

interface MemberQuickStatsProps {
  address: string;
  overview: OverviewLike;
  delegatorsCount: number;
  proposalsCount: number;
  votesCount: number;
  zoraProfile?: ZoraProfile | null;
}

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

  // Zora API returns delta scaled by 1000 (e.g., -1516.82 = -1.52%)
  const percentage = num / 1000;

  return {
    value: `${percentage > 0 ? "+" : ""}${percentage.toFixed(2)}%`,
    isPositive: percentage > 0,
  };
}

export function MemberQuickStats({
  address,
  overview,
  delegatorsCount,
  proposalsCount,
  votesCount,
  zoraProfile,
}: MemberQuickStatsProps) {
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [ethAmount, setEthAmount] = useState(0.001);
  const { buyCreatorCoin, isTrading } = useTradeCreatorCoin();
  const { ethPrice } = useEthPrice();

  const isSelfDelegating = overview.delegate.toLowerCase() === address.toLowerCase();
  const delegatedToAnother = !isSelfDelegating;

  const hasCreatorCoin = !!zoraProfile?.creatorCoin;
  const marketCapFormatted = formatMarketCap(zoraProfile?.creatorCoin?.marketCap);
  const deltaInfo = formatDelta(zoraProfile?.creatorCoin?.marketCapDelta24h);

  const incrementAmount = () => setEthAmount((prev) => Math.min(prev + 0.001, 10));
  const decrementAmount = () => setEthAmount((prev) => Math.max(prev - 0.001, 0.001));

  const handleBuy = async () => {
    if (!zoraProfile?.creatorCoin?.address) return;

    try {
      const success = await buyCreatorCoin({
        creatorCoinAddress: zoraProfile.creatorCoin.address,
        amountInEth: ethAmount.toString(),
      });

      if (success) {
        setShowBuyModal(false);
        setEthAmount(0.001);
      }
    } catch (error) {
      console.error("Error in handleBuy:", error);
      // Modal stays open so user can retry
      // The buyCreatorCoin hook already handles toast notifications
    }
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gnars Held</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.tokenCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delegation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Delegates to</span>
              <span className="font-medium">
                {delegatedToAnother ? (
                  <AddressDisplay
                    address={overview.delegate}
                    variant="compact"
                    showAvatar={false}
                    showCopy={false}
                    showExplorer={false}
                    avatarSize="sm"
                  />
                ) : (
                  "Self"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Delegated by</span>
              <span className="font-medium">{delegatorsCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Proposals</span>
              <span className="font-medium">{proposalsCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Votes</span>
              <span className="font-medium">{votesCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className={hasCreatorCoin ? "border-yellow-500/50" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Creator Coin
              {hasCreatorCoin && (
                <span className="text-xs px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 rounded-full">
                  ZORA
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasCreatorCoin ? (
              <>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{marketCapFormatted}</div>
                  {deltaInfo && (
                    <div
                      className={`flex items-center gap-1 text-xs ${
                        deltaInfo.isPositive ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {deltaInfo.isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{deltaInfo.value} 24h</span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                  onClick={() => setShowBuyModal(true)}
                >
                  Buy Creator Token
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No creator coin</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Buy Creator Token Modal */}
      <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buy Creator Token</DialogTitle>
            <DialogDescription>
              Purchase {zoraProfile?.displayName || zoraProfile?.handle || "this creator"}&apos;s
              token with ETH
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Amount Display Card */}
            <div className="bg-zinc-900 rounded-2xl p-6 space-y-4">
              {/* ETH Amount with controls */}
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

              {/* USD Conversion */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  {formatEthToUsd(ethAmount, ethPrice)}
                </span>
                <span className="text-zinc-500 tabular-nums">
                  {ethAmount.toFixed(6)} ETH
                </span>
              </div>
            </div>

            {/* Quick Amount Buttons */}
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

            {/* Market Cap Info */}
            <p className="text-xs text-muted-foreground text-center">
              Market Cap: {marketCapFormatted}
            </p>

            {/* Action Buttons */}
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
