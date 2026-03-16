"use client";

import { memo, useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KeyStatsProps {
  currentAuction?: {
    id: string;
    highestBid?: string;
    endTime?: string;
    tokenId?: string;
  };
  totalSupply?: number;
  members?: number;
  loading?: boolean;
}

/** Isolated countdown so sibling StatCards don't re-render every second. */
function AuctionCountdownSubtitle({ endTime, fallback }: { endTime?: string; fallback: React.ReactNode }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    if (!endTime) return;

    const update = () => {
      const distance = new Date(endTime).getTime() - Date.now();
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
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  if (!endTime || timeLeft.total <= 0) return <>{fallback}</>;

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
      <Clock className="h-3 w-3" />
      {timeLeft.hours.toString().padStart(2, "0")}:
      {timeLeft.minutes.toString().padStart(2, "0")}:
      {timeLeft.seconds.toString().padStart(2, "0")} left
    </div>
  );
}

const MemoizedStatCard = memo(StatCard);

export function KeyStats({ currentAuction, totalSupply, members, loading }: KeyStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        title={`Current Auction #${currentAuction?.tokenId || "..."}`}
        value={currentAuction?.highestBid ? `${currentAuction.highestBid} ETH` : "Loading..."}
        subtitle={
          <AuctionCountdownSubtitle
            endTime={currentAuction?.endTime}
            fallback={<p className="text-xs text-muted-foreground">Auction #{currentAuction?.id || "..."}</p>}
          />
        }
      />

      <MemoizedStatCard title="Total Supply" value={totalSupply || "..."} subtitle="Gnars minted" />

      <MemoizedStatCard title="DAO Members" value={members || "..."} subtitle="Active holders" />
    </div>
  );
}
