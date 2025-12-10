import { ActivityFeed } from "@/components/feed/ActivityFeed";
import { getAllFeedEvents } from "@/services/feed-events";

interface ActivityFeedSectionProps {
  daysBack?: number;
}

export async function ActivityFeedSection({ daysBack = 30 }: ActivityFeedSectionProps) {
  const events = await getAllFeedEvents(24 * daysBack);

  return <ActivityFeed events={events} />;
}
