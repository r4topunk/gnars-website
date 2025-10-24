/**
 * LiveFeedContainer - Client-side wrapper with polling
 * 
 * Provides real-time updates via client-side polling while leveraging
 * Next.js 15 server-side caching for initial load and background updates.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LiveFeedView } from "./LiveFeedView";
import type { FeedEvent } from "@/lib/types/feed-events";

export interface LiveFeedContainerProps {
  initialEvents: FeedEvent[];
  pollingInterval?: number;
}

export function LiveFeedContainer({
  initialEvents,
  pollingInterval = 30000, // 30 seconds default
}: LiveFeedContainerProps) {
  const router = useRouter();
  const [events, setEvents] = useState<FeedEvent[]>(initialEvents);
  const [isPolling, setIsPolling] = useState(true);

  // Update events when initialEvents change (from server revalidation)
  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  // Client-side polling for real-time updates
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(() => {
      // Use Next.js router refresh to trigger server revalidation
      router.refresh();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [isPolling, pollingInterval, router]);

  // Pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPolling(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return <LiveFeedView events={events} />;
}

