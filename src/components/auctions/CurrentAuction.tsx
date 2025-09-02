"use client";

import { useEffect, useState } from "react";
import { Clock, Gavel } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GnarCard } from "@/components/auctions/GnarCard";
import { AddressDisplay } from "@/components/ui/address-display";

interface AuctionData {
  id: string;
  tokenId: string;
  imageUrl?: string;
  highestBid: string;
  bidder: string;
  endTime: Date;
  settled: boolean;
}

interface CurrentAuctionProps {
  auction?: AuctionData;
  loading?: boolean;
}

export function CurrentAuction({ auction, loading }: CurrentAuctionProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    if (!auction?.endTime) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = auction.endTime.getTime() - now;

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
  }, [auction?.endTime]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <Skeleton className="aspect-square w-full max-w-md rounded-lg" />
          </div>
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!auction) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Current Auction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No active auction at the moment.</p>
        </CardContent>
      </Card>
    );
  }

  const isAuctionEnded = timeLeft.total <= 0;
  const progress = 100 - Math.max(0, Math.min(100, (timeLeft.total / (24 * 60 * 60 * 1000)) * 100));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-5 w-5" />
          Current Auction
          {auction.settled && <Badge variant="secondary">Settled</Badge>}
          {isAuctionEnded && !auction.settled && <Badge variant="destructive">Ended</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* NFT Image */}
          <div className="flex-1">
            <GnarCard
              tokenId={auction.tokenId}
              imageUrl={auction.imageUrl}
            />
          </div>

          {/* Auction Details */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-2xl font-bold">Gnar #{auction.tokenId}</h3>
              <p className="text-muted-foreground">Action sports NFT</p>
            </div>

            {/* Current Bid */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">Current bid</div>
              <div className="text-3xl font-bold">{auction.highestBid} ETH</div>
              <div className="text-sm text-muted-foreground">
                by{" "}
                <AddressDisplay
                  address={auction.bidder}
                  variant="compact"
                  showAvatar={false}
                  showENS={true}
                  showCopy={false}
                  showExplorer={false}
                />
              </div>
            </div>

            {/* Time Remaining */}
            {!isAuctionEnded && !auction.settled && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">Time remaining</span>
                </div>
                <div className="text-xl font-mono mb-2">
                  {timeLeft.hours.toString().padStart(2, "0")}:
                  {timeLeft.minutes.toString().padStart(2, "0")}:
                  {timeLeft.seconds.toString().padStart(2, "0")}
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Bidding Button */}
            <div className="space-y-2">
              {!isAuctionEnded && !auction.settled ? (
                <Button className="w-full" size="lg">
                  Place Bid
                </Button>
              ) : auction.settled ? (
                <Button className="w-full" variant="secondary" disabled>
                  Auction Settled
                </Button>
              ) : (
                <Button className="w-full" variant="secondary" disabled>
                  Auction Ended
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Connect your wallet to participate
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
