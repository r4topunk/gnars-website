"use client";

import { useState } from "react";
import Image from "next/image";
import { Coins, ExternalLink, TrendingDown, TrendingUp, Minus, Plus } from "lucide-react";
import { FaEthereum } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTradeCreatorCoin } from "@/hooks/use-trade-creator-coin";
import { useEthPrice, formatEthToUsd } from "@/hooks/use-eth-price";
import { GNARS_CREATOR_COIN } from "@/lib/config";
import { cn } from "@/lib/utils";

interface CreatedCoin {
  id?: string;
  name?: string;
  symbol?: string;
  description?: string;
  address?: string;
  poolCurrencyTokenAddress?: string;
  marketCap?: string;
  marketCapDelta24h?: string;
  totalSupply?: string;
  uniqueHolders?: number;
  mediaContent?: {
    previewImage?: {
      medium?: string;
      small?: string;
      blurhash?: string;
    };
  };
}

interface MemberCreatedCoinsGridProps {
  coins: CreatedCoin[];
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

  // Zora API returns delta scaled by 1000
  const percentage = num / 1000;

  return {
    value: `${percentage > 0 ? "+" : ""}${percentage.toFixed(2)}%`,
    isPositive: percentage > 0,
  };
}

function CoinCard({ coin }: { coin: CreatedCoin }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [ethAmount, setEthAmount] = useState(0.001);
  const { buyCreatorCoin, isTrading } = useTradeCreatorCoin();
  const { ethPrice } = useEthPrice();
  const deltaInfo = formatDelta(coin.marketCapDelta24h);
  const coinUrl = coin.address ? `https://zora.co/@${coin.address}` : undefined;
  const isGnarsPaired =
    coin.poolCurrencyTokenAddress != null &&
    coin.poolCurrencyTokenAddress.toLowerCase() === GNARS_CREATOR_COIN.toLowerCase();

  const incrementAmount = () => setEthAmount((prev) => Math.min(prev + 0.001, 10));
  const decrementAmount = () => setEthAmount((prev) => Math.max(prev - 0.001, 0.001));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsFlipped((prev) => !prev);
    }
  };

  const handleBuy = async () => {
    if (!coin.address || ethAmount <= 0) return;

    try {
      await buyCreatorCoin({
        creatorCoinAddress: coin.address,
        amountInEth: ethAmount.toString(),
      });
      setShowBuyModal(false);
      setEthAmount(0.001);
    } catch (error) {
      console.error("Failed to buy creator token:", error);
      // Modal stays open on error so user can retry
    }
  };

  return (
    <div
      className="relative"
      style={{ perspective: "1000px" }}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onFocus={() => setIsFlipped(true)}
      onBlur={() => setIsFlipped(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isFlipped}
      aria-label={`Flip card for ${coin.name || "coin"}`}
    >
      <div
        className="relative w-full transition-transform duration-700 cursor-pointer"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front face - Coin Image */}
        <Card
          className="overflow-hidden border-2"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <CardContent className="p-0">
            {coin.mediaContent?.previewImage?.medium ? (
              <div className="relative aspect-[3/4] w-full bg-gradient-to-br from-muted to-muted/50">
                <Image
                  src={coin.mediaContent.previewImage.medium}
                  alt={coin.name || "Coin"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  unoptimized
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* GNARS Logo Stamp */}
                {isGnarsPaired && (
                  <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center border-2 border-yellow-500">
                    <span className="text-xl font-black">⌐◨-◨</span>
                  </div>
                )}

                {/* Title overlay on image */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-base line-clamp-1 drop-shadow-lg">
                        {coin.name || "Unnamed Coin"}
                      </h3>
                      <p className="text-white/90 text-xs font-semibold drop-shadow-md">
                        {coin.symbol || "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/70 text-[10px] font-medium drop-shadow-md">
                        Market Cap
                      </p>
                      <p
                        className={cn(
                          "font-bold text-sm drop-shadow-lg",
                          deltaInfo?.isPositive
                            ? "text-green-400"
                            : deltaInfo
                              ? "text-red-400"
                              : "text-white",
                        )}
                      >
                        {formatMarketCap(coin.marketCap)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-[3/4] w-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                <Coins className="h-16 w-16 text-muted-foreground/50" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back face - Stats & Details */}
        <Card
          className="absolute inset-0 overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <CardContent className="p-0 h-full flex flex-col">
            <div className="aspect-[3/4] w-full p-4 flex flex-col justify-between">
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-base line-clamp-1">
                      {coin.name || "Unnamed Coin"}
                    </h3>
                    <p className="text-sm font-semibold text-yellow-500 mt-0.5">
                      {coin.symbol || "—"}
                    </p>
                  </div>
                  {coinUrl && (
                    <a
                      href={coinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-muted rounded-full transition-colors z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {coin.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                    {coin.description}
                  </p>
                )}
              </div>

              {/* Stats Section */}
              <div className="space-y-2 mt-auto">
                <div className="h-px bg-border" />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <span className="text-xs font-medium text-muted-foreground">Market Cap</span>
                    <span className="text-sm font-bold">{formatMarketCap(coin.marketCap)}</span>
                  </div>

                  {deltaInfo && (
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <span className="text-xs font-medium text-muted-foreground">24h Change</span>
                      <span
                        className={cn(
                          "flex items-center gap-1 text-sm font-bold",
                          deltaInfo.isPositive ? "text-green-500" : "text-red-500",
                        )}
                      >
                        {deltaInfo.isPositive ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {deltaInfo.value}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <span className="text-xs font-medium text-muted-foreground">Holders</span>
                    <span className="text-sm font-bold">{coin.uniqueHolders || 0}</span>
                  </div>
                </div>

                {/* Buy Button */}
                {coin.address && (
                  <Button
                    size="sm"
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBuyModal(true);
                    }}
                  >
                    Buy
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buy Creator Token Modal */}
      <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buy Creator Token</DialogTitle>
            <DialogDescription>
              Purchase {coin.name || coin.symbol || "this creator"}&apos;s token with ETH
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
              Market Cap: {formatMarketCap(coin.marketCap)}
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
    </div>
  );
}

export function MemberCreatedCoinsGrid({ coins }: MemberCreatedCoinsGridProps) {
  if (!coins || coins.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No coins created yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {coins.map((coin, index) => (
        <CoinCard key={coin.id ?? coin.address ?? `coin-${index}`} coin={coin} />
      ))}
    </div>
  );
}
