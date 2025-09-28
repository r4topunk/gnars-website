"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { zeroAddress } from "viem";
import { useDaoAuction } from "@buildeross/hooks";
import { GnarImageTile } from "@/components/auctions/GnarImageTile";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { getStatusConfig } from "@/components/proposals/utils";
import { ProposalStatus } from "@/lib/schemas/proposals";

export function AuctionSpotlight() {
  const { highestBid, highestBidder, endTime, startTime, tokenId, tokenUri } = useDaoAuction({
    collectionAddress: GNARS_ADDRESSES.token,
    auctionAddress: GNARS_ADDRESSES.auction,
    chainId: CHAIN.id,
  });

  const tokenName = tokenUri?.name;
  const imageUrl = tokenUri?.image
    ? tokenUri.image.startsWith("ipfs://")
      ? tokenUri.image.replace("ipfs://", "https://ipfs.io/ipfs/")
      : tokenUri.image
    : undefined;
  const endTimeMs = endTime ? new Date(endTime * 1000).getTime() : 0;
  const startTimeMs = startTime ? new Date(startTime * 1000).getTime() : 0;
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    if (!endTimeMs) return;
    const timer = setInterval(() => {
      const now = Date.now();
      const distance = endTimeMs - now;
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
  }, [endTimeMs]);

  const { progressPercentage, isLive, isEndingSoon } = useMemo(() => {
    const fallbackDuration = 24 * 60 * 60 * 1000;
    const duration = startTimeMs && endTimeMs ? Math.max(endTimeMs - startTimeMs, 0) : fallbackDuration;
    const elapsed = Math.max(0, Math.min(duration, duration - Math.max(timeLeft.total, 0)));
    const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
    const live = timeLeft.total > 0;
    const endingSoon = live && timeLeft.total <= 5 * 60 * 1000;
    return { progressPercentage: progress, isLive: live, isEndingSoon: endingSoon };
  }, [startTimeMs, endTimeMs, timeLeft.total]);

  const badgeStatus: ProposalStatus = isLive
    ? isEndingSoon
      ? ProposalStatus.PENDING
      : ProposalStatus.ACTIVE
    : ProposalStatus.DEFEATED;
  const { color } = getStatusConfig(badgeStatus);
  const badgeLabel = isLive ? (isEndingSoon ? "Ending Soon" : "Live Auction") : "Ended";

  return (
    <Card className="w-full max-w-md bg-card">
      <CardContent className="py-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-semibold">
              {tokenName?.replace("Gnars", "Gnar") || (tokenId ? `Gnar #${tokenId.toString()}` : "Latest Auction")}
            </div>
            <Badge className={`${color} text-xs`}>{badgeLabel}</Badge>
          </div>

          <GnarImageTile tokenId={Number(tokenId || 0)} imageUrl={imageUrl} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col text-center items-start">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Time left
                </div>
                <div className="text-xl font-mono">
                  {timeLeft.hours.toString().padStart(2, "0")}:{timeLeft.minutes
                    .toString()
                    .padStart(2, "0")}:{timeLeft.seconds.toString().padStart(2, "0")}
                </div>
              </div>
              <div className="flex flex-col text-center items-end">
                <div className="text-sm text-muted-foreground">Current Highest Bid</div>
                <div className="text-2xl font-bold">{highestBid ? `${highestBid} ETH` : "—"}</div>
              </div>
            </div>

            <Progress value={progressPercentage} className="h-2" />

            <Button className="w-full touch-manipulation">Place Bid</Button>

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
  );
}


