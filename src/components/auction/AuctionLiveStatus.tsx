"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { zeroAddress } from "viem";
import { Progress } from "@/components/ui/progress";
import { AddressDisplay } from "@/components/ui/address-display";

interface AuctionLiveStatusProps {
  highestBid: string | undefined;
  highestBidder: string | undefined;
  endTime: number | undefined;
  startTime: number | undefined;
  /** Increments when a new bid is detected — triggers animation */
  bidSignal: number;
  /** Leading bid's on-chain comment (decoded from calldata) */
  leadingBidComment: string | null | undefined;
  /** Total number of bids on this auction */
  bidCount: number;
  onBidHistoryOpen: () => void;
}

export function AuctionLiveStatus({
  highestBid,
  highestBidder,
  endTime,
  startTime,
  bidSignal,
  leadingBidComment,
  bidCount,
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

  // Progress bar color: green (plenty of time) → amber (< 30%) → red (< 10%)
  const remainingPercent = 100 - progressPercentage;
  const progressColor = remainingPercent <= 10
    ? "[&>div]:bg-red-500"
    : remainingPercent <= 30
      ? "[&>div]:bg-amber-500"
      : "[&>div]:bg-green-500";

  const timeString = `${timeLeft.hours.toString().padStart(2, "0")}:${timeLeft.minutes.toString().padStart(2, "0")}:${timeLeft.seconds.toString().padStart(2, "0")}`;

  const hasBidder = highestBidder && highestBidder !== zeroAddress;

  return (
    <>
      {/* Leading bid card — the hero element */}
      {hasBidder ? (
        <div className={`rounded-lg border border-border/60 bg-muted/30 p-3 transition-all ${
          bidAnimating ? "ring-2 ring-primary/30" : ""
        }`}>
          <div className="flex items-center justify-between">
            <AddressDisplay
              address={highestBidder}
              variant="compact"
              showAvatar={true}
              avatarSize="sm"
              showCopy={false}
              showExplorer={false}
              truncateLength={4}
              onAddressClick={() => {}}
              className="text-sm font-medium text-foreground pointer-events-none"
            />
            <span className={`text-lg font-bold transition-all duration-300 ${
              bidAnimating ? "scale-110 text-primary" : "scale-100"
            }`}>
              {highestBid ? `${highestBid} ETH` : ""}
            </span>
          </div>
          {leadingBidComment && (
            <p className="text-xs text-muted-foreground italic pl-7 mt-1">
              &ldquo;{leadingBidComment}&rdquo;
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-2 text-muted-foreground text-sm">
          No bids yet — be the first!
        </div>
      )}

      {/* Time + progress */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${
          isLive
            ? isEndingSoon ? "bg-amber-500 animate-pulse" : "bg-green-500"
            : "bg-muted-foreground"
        }`} />
        <span>
          {isLive
            ? isEndingSoon
              ? `Ending soon · ${timeString}`
              : `${timeString} left`
            : "Ended"
          }
        </span>
        <Progress value={progressPercentage} className={`h-1 flex-1 ${progressColor}`} />
      </div>
    </>
  );
}

/** Separate component for the bid history footer link */
export function AuctionBidHistoryLink({
  bidCount,
  onBidHistoryOpen,
}: {
  bidCount: number;
  onBidHistoryOpen: () => void;
}) {
  if (bidCount === 0) return null;

  return (
    <button
      type="button"
      onClick={onBidHistoryOpen}
      className="group flex w-full items-center justify-end gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <span>{bidCount} {bidCount === 1 ? "bid" : "bids"} · View all</span>
      <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
