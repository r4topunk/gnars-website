"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

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

export function KeyStats({ currentAuction, totalSupply, members, loading }: KeyStatsProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    if (!currentAuction?.endTime) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(currentAuction.endTime!).getTime() - now;

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
  }, [currentAuction?.endTime]);

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
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Auction #{currentAuction?.tokenId || '...'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-2xl font-bold">
            {currentAuction?.highestBid ? `${currentAuction.highestBid} ETH` : 'Loading...'}
          </div>
          {currentAuction?.endTime && timeLeft.total > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              {timeLeft.hours.toString().padStart(2, '0')}:
              {timeLeft.minutes.toString().padStart(2, '0')}:
              {timeLeft.seconds.toString().padStart(2, '0')} left
            </div>
          )}
          {!currentAuction?.endTime && (
            <p className="text-xs text-muted-foreground">
              Auction #{currentAuction?.id || '...'}
            </p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Supply
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-2xl font-bold">
            {totalSupply || '...'}
          </div>
          <p className="text-xs text-muted-foreground">
            Gnars minted
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            DAO Members
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="text-2xl font-bold">
            {members || '...'}
          </div>
          <p className="text-xs text-muted-foreground">
            Active holders
          </p>
        </CardContent>
      </Card>
    </div>
  );
}