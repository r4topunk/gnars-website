import { ActivityFeed } from "@/components/feed/ActivityFeed";
import { getAllFeedEvents } from "@/services/feed-events";

interface ActivityFeedSectionProps {
  daysBack?: number;
  responsive?: boolean;
  singleColumn?: boolean;
}

export async function ActivityFeedSection({ daysBack = 30, responsive = false, singleColumn = false }: ActivityFeedSectionProps) {
  const events = await getAllFeedEvents(24 * daysBack);

  return <ActivityFeed events={events} responsive={responsive} singleColumn={singleColumn} />;
}
