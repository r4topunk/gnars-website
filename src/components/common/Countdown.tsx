"use client";

import { useEffect, useState } from "react";
import { formatTimeRemaining, parseBlockchainTimestamp } from "@/lib/utils/proposal-state";

interface CountdownProps {
  end: string | number; // Timestamp (Unix seconds or ISO string)
  onEnd?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Countdown timer component
 * Displays time remaining until target timestamp
 * Updates every second
 * Calls onEnd callback when time reaches zero
 */
export function Countdown({ end, onEnd, style, className }: CountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [hasEnded, setHasEnded] = useState(false);

  useEffect(() => {
    const endDate = parseBlockchainTimestamp(end);

    const updateCountdown = () => {
      const now = new Date();
      const diffMs = endDate.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeRemaining("0s");
        if (!hasEnded) {
          setHasEnded(true);
          onEnd?.();
        }
      } else {
        setTimeRemaining(formatTimeRemaining(endDate));
      }
    };

    // Update immediately
    updateCountdown();

    // Then update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [end, onEnd, hasEnded]);

  return (
    <span className={className} style={style}>
      {timeRemaining}
    </span>
  );
}
