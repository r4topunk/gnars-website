/**
 * LiveFeedView - Main feed display component
 * 
 * Displays filtered feed events with infinite scroll and empty states.
 * Presentational component - receives data via props.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Masonry from "react-masonry-css";
import { FeedEvent, FeedFilters } from "@/lib/types/feed-events";
import { FeedEventCard } from "./FeedEventCard";
import { FeedFilters as FeedFiltersComponent } from "./FeedFilters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export interface LiveFeedViewProps {
  events: FeedEvent[];
  isLoading?: boolean;
  error?: Error | null;
}

const DEFAULT_FILTERS: FeedFilters = {
  priorities: ["HIGH", "MEDIUM", "LOW"],
  categories: ["governance", "auction", "token", "delegation", "treasury", "admin", "settings"],
  timeRange: "30d",
  showOnlyWithComments: false,
};

export function LiveFeedView({ events, isLoading, error }: LiveFeedViewProps) {
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS);

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const timeRangeSeconds = {
      "1h": 3600,
      "24h": 86400,
      "7d": 604800,
      "30d": 2592000,
      "all": Infinity,
    }[filters.timeRange];

    return events.filter(event => {
      // Time range filter
      if (now - event.timestamp > timeRangeSeconds) return false;

      // Priority filter
      if (!filters.priorities.includes(event.priority)) return false;

      // Category filter
      if (!filters.categories.includes(event.category)) return false;

      // Comments filter (only applies to VoteCast events)
      if (filters.showOnlyWithComments) {
        if (event.type === "VoteCast" && !event.reason) return false;
        if (event.type !== "VoteCast") return false;
      }

      return true;
    });
  }, [events, filters]);

  // Incremental rendering for performance
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredEvents.length));
        }
      },
      { rootMargin: "200px" },
    );

    const current = sentinelRef.current;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
    };
  }, [filteredEvents.length]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

  if (isLoading) {
    return <LiveFeedSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Feed</AlertTitle>
        <AlertDescription>
          Failed to load live feed events. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <FeedFiltersComponent filters={filters} onFiltersChange={setFilters} />
        <div className="text-sm text-muted-foreground">
          {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}
        </div>
      </div>

      {/* Events list - Masonry layout with horizontal flow */}
      {filteredEvents.length === 0 ? (
        <EmptyState filters={filters} />
      ) : (
        <>
          <Masonry
            breakpointCols={{ default: 2, 640: 1 }}
            className="flex -ml-3 w-auto"
            columnClassName="pl-3 bg-clip-padding"
          >
            {filteredEvents.slice(0, visibleCount).map((event) => (
              <div key={event.id} className="mb-3">
                <FeedEventCard event={event} />
              </div>
            ))}

            {/* Loading indicator for more events */}
            {filteredEvents.length > visibleCount && (
              <div className="mb-3">
                <Skeleton className="h-24 w-full" />
              </div>
            )}
          </Masonry>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-10" />
        </>
      )}
    </div>
  );
}

// Subcomponents

function LiveFeedSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Masonry
        breakpointCols={{ default: 2, 640: 1 }}
        className="flex -ml-3 w-auto"
        columnClassName="pl-3 bg-clip-padding"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-3">
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </Masonry>
    </div>
  );
}

function EmptyState({ filters }: { filters: FeedFilters }) {
  const hasActiveFilters = 
    filters.priorities.length < 3 ||
    filters.categories.length < 7 ||
    filters.timeRange !== "30d" ||
    filters.showOnlyWithComments;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {hasActiveFilters
          ? "No events match your current filters. Try adjusting your filters to see more events."
          : "There are no recent events to display. Check back later for new activity."}
      </p>
    </div>
  );
}

