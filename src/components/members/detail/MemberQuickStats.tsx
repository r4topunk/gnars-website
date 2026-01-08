"use client";

import { useState } from "react";
import { ExternalLink, TrendingDown, TrendingUp } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ZoraProfile } from "@/hooks/use-zora-profile";
import { useTradeCreatorCoin } from "@/hooks/use-trade-creator-coin";

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
  const [ethAmount, setEthAmount] = useState("0.001");
  const { buyCreatorCoin, isTrading } = useTradeCreatorCoin();
  
  const isSelfDelegating = overview.delegate.toLowerCase() === address.toLowerCase();
  const delegatedToAnother = !isSelfDelegating;

  const hasCreatorCoin = !!zoraProfile?.creatorCoin;
  const marketCapFormatted = formatMarketCap(zoraProfile?.creatorCoin?.marketCap);
  const deltaInfo = formatDelta(zoraProfile?.creatorCoin?.marketCapDelta24h);

  const handleBuy = async () => {
    if (!zoraProfile?.creatorCoin?.address) return;
    
    const success = await buyCreatorCoin({
      creatorCoinAddress: zoraProfile.creatorCoin.address,
      amountInEth: ethAmount,
    });
    
    if (success) {
      setShowBuyModal(false);
      setEthAmount("0.001");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buy Creator Token</DialogTitle>
          <DialogDescription>
            Purchase {zoraProfile?.displayName || zoraProfile?.handle || "this creator"}&apos;s token with ETH
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="eth-amount">Amount (ETH)</Label>
            <Input
              id="eth-amount"
              type="number"
              step="0.001"
              min="0.001"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              placeholder="0.001"
            />
            <p className="text-xs text-muted-foreground">
              Market Cap: {marketCapFormatted}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBuyModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBuy}
              disabled={isTrading || !ethAmount || parseFloat(ethAmount) <= 0}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
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
