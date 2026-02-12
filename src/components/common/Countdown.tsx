"use client";

import { useEffect, useState, useRef } from "react";
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
  const hasEndedRef = useRef(false);

  useEffect(() => {
    const endDate = parseBlockchainTimestamp(end);
    hasEndedRef.current = false; // Reset when countdown restarts

    const updateCountdown = () => {
      const now = new Date();
      const diffMs = endDate.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeRemaining("0s");
        if (!hasEndedRef.current) {
          hasEndedRef.current = true;
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
  }, [end]); // Only depend on 'end' - restart countdown when target changes

  return (
    <span className={className} style={style}>
      {timeRemaining}
    </span>
  );
}
