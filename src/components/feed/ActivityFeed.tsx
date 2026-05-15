"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { FeedEvent } from "@/lib/types/feed-events";
import { LiveFeedView } from "./LiveFeedView";

interface ActivityFeedProps {
  events: FeedEvent[];
  responsive?: boolean;
  singleColumn?: boolean;
}

export function ActivityFeed({
  events,
  responsive = false,
  singleColumn = false,
}: ActivityFeedProps) {
  const t = useTranslations("feed");
  return (
    <Card className={responsive ? "h-full flex flex-col" : ""}>
      <SectionHeader
        title={t("title")}
        description={t("description")}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/feed">
              {t("viewAll")}
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
