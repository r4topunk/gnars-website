"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { zeroAddress } from "viem";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AddressDisplay } from "@/components/ui/address-display";
import { getStatusConfig } from "@/components/proposals/utils";
import { ProposalStatus } from "@/lib/schemas/proposals";

interface AuctionLiveStatusProps {
  highestBid: string | undefined;
  highestBidder: string | undefined;
  endTime: number | undefined;
  startTime: number | undefined;
  /** Increments when a new bid is detected — triggers animation */
  bidSignal: number;
  onBidHistoryOpen: () => void;
}

export function AuctionLiveStatus({
  highestBid,
  highestBidder,
  endTime,
  startTime,
  bidSignal,
  onBidHistoryOpen,
}: AuctionLiveStatusProps) {
  const endTimeMs = endTime ? endTime * 1000 : 0;
  const startTimeMs = startTime ? startTime * 1000 : 0;
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, total: 0 });
  const [bidAnimating, setBidAnimating] = useState(false);
  const prevBidSignal = useRef<number>(bidSignal);

  // Countdown timer
  useEffect(() => {
    if (!endTimeMs) return;
    const tick = () => {
      const distance = endTimeMs - Date.now();
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
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endTimeMs]);

  // Bid animation trigger
  useEffect(() => {
    if (bidSignal > prevBidSignal.current) {
      setBidAnimating(true);
      const timeout = setTimeout(() => setBidAnimating(false), 1500);
      prevBidSignal.current = bidSignal;
      return () => clearTimeout(timeout);
    }
  }, [bidSignal]);

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
    <>
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
          <div
            className={`text-2xl font-bold transition-all duration-300 ${
              bidAnimating
                ? "scale-110 text-primary"
                : "scale-100"
            }`}
          >
            {highestBid ? `${highestBid} ETH` : "—"}
          </div>
        </div>
      </div>

      <Progress value={progressPercentage} className="h-2" />

      <div className="flex items-center justify-between">
        <Badge className={`${color} text-xs`}>{badgeLabel}</Badge>
        {highestBidder && highestBidder !== zeroAddress && (
          <button
            type="button"
            onClick={onBidHistoryOpen}
            className={`group flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5 transition-all hover:border-border/80 hover:bg-muted/40 ${
              bidAnimating ? "ring-2 ring-primary/30" : ""
            }`}
          >
            <span className="text-[11px] text-muted-foreground/60">
              {isLive ? "Leading" : "Winner"}
            </span>
            <AddressDisplay
              address={highestBidder}
              variant="compact"
              showAvatar={true}
              avatarSize="sm"
              showCopy={false}
              showExplorer={false}
              truncateLength={4}
              onAddressClick={() => {}}
              className="text-sm text-foreground pointer-events-none"
            />
          </button>
        )}
      </div>
    </>
  );
}
