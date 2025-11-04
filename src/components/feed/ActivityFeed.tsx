"use client";

import { LiveFeedView } from "./LiveFeedView";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/common/SectionHeader";
import type { FeedEvent } from "@/lib/types/feed-events";

interface ActivityFeedProps {
  events: FeedEvent[];
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <Card>
      <SectionHeader
        title="Live Feed"
        description="Real-time activity from the Gnars DAO"
      />
      <CardContent className="space-y-4">
        {/* Scrollable Inner Container */}
        <div className="overflow-y-auto rounded-lg border bg-background/50 p-4 max-h-[500px]">
          <LiveFeedView events={events} showFilters={false} />
        </div>
      </CardContent>
    </Card>
  );
}
