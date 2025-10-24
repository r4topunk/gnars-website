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

  // Group events by day (first 7 days) or week (older events)
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, FeedEvent[]>();
    const now = new Date();
    const nowDayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const sevenDaysAgo = nowDayStart - (7 * 24 * 60 * 60 * 1000);
    
    filteredEvents.forEach(event => {
      const date = new Date(event.timestamp * 1000);
      const dateKey = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      
      let groupKey: string;
      
      // Events within last 7 days: group by day
      if (dateKey >= sevenDaysAgo) {
        groupKey = `day-${dateKey}`;
      } else {
        // Events older than 7 days: group by week
        // Get the Monday of the week (week starts on Monday)
        const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days to subtract to get to Monday
        const mondayDate = new Date(date);
        mondayDate.setUTCDate(date.getUTCDate() - daysToMonday);
        const weekKey = Date.UTC(mondayDate.getUTCFullYear(), mondayDate.getUTCMonth(), mondayDate.getUTCDate());
        groupKey = `week-${weekKey}`;
      }
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(event);
    });

    // Convert to array and sort by date (newest first)
    return Array.from(groups.entries())
      .sort((a, b) => {
        const aKey = parseInt(a[0].split('-')[1]);
        const bKey = parseInt(b[0].split('-')[1]);
        return bKey - aKey;
      })
      .map(([groupKey, groupEvents]) => {
        const [type, timestamp] = groupKey.split('-');
        return {
          dateKey: parseInt(timestamp),
          events: groupEvents,
          isWeek: type === 'week',
        };
      });
  }, [filteredEvents]);

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

      {/* Events list - Grouped by day with masonry layout */}
      {filteredEvents.length === 0 ? (
        <EmptyState filters={filters} />
      ) : (
        <>
          <div className="space-y-8">
            {groupedEvents.map(({ dateKey, events: dayEvents, isWeek }) => {
              // Check if any events from this day/week are visible
              const visibleDayEvents = dayEvents.filter((_, idx) => {
                const totalPreviousEvents = groupedEvents
                  .filter(g => g.dateKey > dateKey)
                  .reduce((sum, g) => sum + g.events.length, 0);
                return totalPreviousEvents + idx < visibleCount;
              });

              if (visibleDayEvents.length === 0) return null;

              return (
                <div key={dateKey} className="space-y-3">
                  {/* Day/Week header */}
                  <GroupHeader dateKey={dateKey} isWeek={isWeek} />

                  {/* Events for this day */}
                  <Masonry
                    breakpointCols={{ default: 2, 640: 1 }}
                    className="flex -ml-3 w-auto"
                    columnClassName="pl-3 bg-clip-padding"
                  >
                    {visibleDayEvents.map((event) => (
                      <div key={event.id} className="mb-3">
                        <FeedEventCard event={event} />
                      </div>
                    ))}
                  </Masonry>
                </div>
              );
            })}

            {/* Loading indicator for more events */}
            {filteredEvents.length > visibleCount && (
              <div className="flex justify-center">
                <Skeleton className="h-24 w-full max-w-md" />
              </div>
            )}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-10" />
        </>
      )}
    </div>
  );
}

// Subcomponents

function GroupHeader({ dateKey, isWeek }: { dateKey: number; isWeek?: boolean }) {
  // Calculate label - runs on both server and client
  const now = new Date();
  const nowDayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysDiff = Math.round((nowDayStart - dateKey) / (1000 * 60 * 60 * 24));
  
  let label: string;
  
  if (isWeek) {
    // For weekly groups, show week range
    const weekStart = new Date(dateKey);
    const weekEnd = new Date(dateKey + (6 * 24 * 60 * 60 * 1000));
    
    const weeksDiff = Math.floor(daysDiff / 7);
    
    if (weeksDiff === 1) {
      label = "Last week";
    } else if (weeksDiff < 4) {
      label = `${weeksDiff} weeks ago`;
    } else {
      // Show date range for older weeks
      const startStr = weekStart.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric",
        timeZone: "UTC"
      });
      const endStr = weekEnd.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric", 
        year: weekEnd.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        timeZone: "UTC"
      });
      label = `${startStr} - ${endStr}`;
    }
  } else {
    // For daily groups (within last 7 days)
    if (daysDiff === 0) {
      label = "Today";
    } else if (daysDiff === 1) {
      label = "Yesterday";
    } else if (daysDiff <= 7) {
      label = `${daysDiff} days ago`;
    } else {
      // Fallback for edge cases
      const date = new Date(dateKey);
      label = date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric",
        timeZone: "UTC"
      });
    }
  }
  
  return (
    <div className="flex items-center gap-3">
      <h3 className="text-lg font-semibold text-foreground" suppressHydrationWarning>
        {label}
      </h3>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

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

