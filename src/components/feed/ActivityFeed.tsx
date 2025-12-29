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
  responsive?: boolean;
  singleColumn?: boolean;
}

export function ActivityFeed({ events, responsive = false, singleColumn = false }: ActivityFeedProps) {
  return (
    <Card className={responsive ? "h-full flex flex-col" : ""}>
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
      <CardContent className={responsive ? "flex-1 min-h-0 flex flex-col" : ""}>
        {/* Scrollable Inner Container */}
        <div
          className={`overflow-y-auto rounded-lg border bg-background/50 p-4 ${
            responsive ? "flex-1 min-h-0" : "max-h-[500px]"
          }`}
        >
          <LiveFeedView events={events} showFilters={false} singleColumn={singleColumn} />
        </div>
      </CardContent>
    </Card>
  );
}
