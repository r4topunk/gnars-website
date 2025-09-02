"use client";

import { useEffect, useState } from "react";
import { useDaoAuction } from "@buildeross/hooks";
import { Clock, TrendingUp, Trophy, Users, Zap } from "lucide-react";
import { zeroAddress } from "viem";
import { Badge } from "@/components/ui/badge";
import { CountUp } from "@/components/ui/count-up";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddressDisplay } from "@/components/ui/address-display";
import { Progress } from "@/components/ui/progress";
import { GnarCard } from "@/components/gnar-card";
import { CHAIN, DAO_DESCRIPTION, GNARS_ADDRESSES } from "@/lib/config";

interface HeroSectionProps {
  stats: {
    totalSupply: number;
    members: number;
    treasuryValue?: string;
  };
}

export function HeroSection({ stats }: HeroSectionProps) {
  const { highestBid, highestBidder, endTime, startTime, tokenId, tokenUri } = useDaoAuction({
    collectionAddress: GNARS_ADDRESSES.token,
    auctionAddress: GNARS_ADDRESSES.auction,
    chainId: CHAIN.id,
  });

  const auctionEndDate = endTime ? new Date(endTime * 1000) : undefined;
  const auctionStartDate = startTime ? new Date(startTime * 1000) : undefined;
  const auctionEndMs = auctionEndDate ? auctionEndDate.getTime() : 0;
  const auctionStartMs = auctionStartDate ? auctionStartDate.getTime() : 0;
  const ENDING_SOON_THRESHOLD_MS = 5 * 60 * 1000;
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    if (!auctionEndMs) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = auctionEndMs - now;

      if (distance > 0) {
        setTimeLeft({
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
          total: distance,
        });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, total: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auctionEndMs]);

  // Calculate auction progress based on actual start/end times when available
  const fallbackDuration = 24 * 60 * 60 * 1000; // 24 hours in ms
  const auctionDuration =
    auctionStartMs && auctionEndMs ? Math.max(auctionEndMs - auctionStartMs, 0) : fallbackDuration;
  const elapsed = Math.max(
    0,
    Math.min(auctionDuration, auctionDuration - Math.max(timeLeft.total, 0)),
  );
  const progressPercentage = Math.min(100, Math.max(0, (elapsed / auctionDuration) * 100));
  const isLive = timeLeft.total > 0;
  const isEndingSoon = isLive && timeLeft.total <= ENDING_SOON_THRESHOLD_MS;

  const imageSrc = tokenUri?.image
    ? tokenUri.image.startsWith("ipfs://")
      ? tokenUri.image.replace("ipfs://", "https://ipfs.io/ipfs/")
      : tokenUri.image
    : undefined;

  return (
    <section className="relative overflow-hidden">
      {/* Hero Content */}
      <div className="relative z-10 px-4 py-8 md:py-10 lg:py-12">
        <div className="mx-auto max-w-6xl">
          {/* Main Hero */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left Column - Brand & CTA */}
            <div className="flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <Badge
                  variant="secondary"
                  className="w-fit bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                >
                  <Zap className="mr-1 h-3 w-3" />
                  Action Sports DAO
                </Badge>

                <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                  <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    Gnars DAO
                  </span>
                </h1>

                <p className="text-lg text-muted-foreground md:text-xl">{DAO_DESCRIPTION}</p>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      <CountUp value={Number(stats.totalSupply || 0)} durationMs={800} />
                    </div>
                    <div className="text-xs text-muted-foreground">Total NFTs</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      <CountUp value={Number(stats.members || 0)} durationMs={800} />
                    </div>
                    <div className="text-xs text-muted-foreground">Members</div>
                  </div>
                </div>
                {stats.treasuryValue && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="font-semibold">
                        <CountUp value={parseFloat(stats.treasuryValue || "0")} decimals={1} durationMs={900} /> ETH
                      </div>
                      <div className="text-xs text-muted-foreground">Treasury</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Current Auction Spotlight */}
            <div className="flex items-center justify-center">
              <Card className="w-full max-w-md border-2 bg-card shadow-lg">
                <CardContent className="py-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-semibold">
                        {tokenUri?.name.replace("Gnars", "Gnar") ||
                          (tokenId ? `Gnar #${tokenId.toString()}` : "Latest Auction")}
                      </div>
                      {isLive ? (
                        <Badge
                          variant="secondary"
                          className={
                            isEndingSoon
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-transparent"
                              : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-transparent"
                          }
                        >
                          {isEndingSoon ? "Ending Soon" : "Live Auction"}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Ended</Badge>
                      )}
                    </div>

                    {/* NFT Preview */}
                    <GnarCard
                      tokenId={tokenId || 0}
                      imageUrl={imageSrc}
                    />

                    <div className="space-y-3">
                      {/* Bid and Timer Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col text-center items-start">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Time left
                          </div>
                          <div className="text-xl font-mono">
                            {timeLeft.hours.toString().padStart(2, "0")}:
                            {timeLeft.minutes.toString().padStart(2, "0")}:
                            {timeLeft.seconds.toString().padStart(2, "0")}
                          </div>
                        </div>
                        <div className="flex flex-col text-center items-end">
                          <div className="text-sm text-muted-foreground">Current Highest Bid</div>
                          <div className="text-2xl font-bold">
                            {highestBid ? `${highestBid} ETH` : "—"}
                          </div>
                        </div>
                      </div>

                      <Progress value={progressPercentage} className="h-2" />

                      <Button className="w-full touch-manipulation min-h-[44px]">Place Bid</Button>

                      {highestBidder && highestBidder !== zeroAddress && (
                        <div className="text-center text-xs text-muted-foreground">
                          <span className="mr-1">Leading bidder:</span>
                          <AddressDisplay
                            address={highestBidder}
                            variant="compact"
                            showAvatar={false}
                            showCopy={false}
                            showExplorer={false}
                            truncateLength={4}
                            className="inline-flex"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
