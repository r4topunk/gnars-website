"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LiveFeedView } from "./LiveFeedView";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Button } from "@/components/ui/button";
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
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/feed">
              View All Activity
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
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
