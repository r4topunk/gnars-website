import { HomeClientComponents } from "@/components/home-client-components";
import { Proposal } from "@/components/proposals/types";
import { listProposals } from "@/services/proposals";
import { getAllFeedEvents } from "@/services/feed-events";
import type { FeedEvent } from "@/lib/types/feed-events";

export const dynamic = "force-dynamic";

async function getRecentProposals(): Promise<Proposal[]> {
  try {
    // Fetch all proposals for the feed (defaults to 200)
    const proposals = await listProposals();
    return proposals;
  } catch (error) {
    console.error("Failed to fetch recent proposals:", error);
    return [];
  }
}

async function getFeedEvents(): Promise<FeedEvent[]> {
  try {
    // Fetch last 30 days of events (same as feed page)
    const events = await getAllFeedEvents(24 * 30); // 30 days
    return events;
  } catch (error) {
    console.error("Failed to fetch feed events:", error);
    return [];
  }
}

export default async function Home() {
  const proposals = await getRecentProposals();
  const feedEvents = await getFeedEvents();

  return (
    <div className="flex flex-1 flex-col">
      <HomeClientComponents proposals={proposals} feedEvents={feedEvents} />
    </div>
  );
}
