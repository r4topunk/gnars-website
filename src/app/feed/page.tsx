/**
 * Live Feed Page
 * 
 * Displays real-time DAO activity feed with all governance, auction, and token events.
 * Uses Next.js 15 caching with automatic revalidation on Vercel.
 */

import { Suspense } from "react";
import { LiveFeedView } from "@/components/feed/LiveFeedView";
import { getAllFeedEvents } from "@/services/feed-events";

export const dynamic = "force-dynamic";

// Revalidate every 15 seconds for fresh data
export const revalidate = 15;

/**
 * Fetch feed events from The Graph subgraph
 * 
 * Uses unstable_cache for automatic revalidation
 */
async function getFeedEvents() {
  try {
    // Fetch last 30 days of events (Gnars doesn't have daily activity)
    const events = await getAllFeedEvents(24 * 30); // 30 days
    console.log("[feed page] Got events:", events.length);
    
    // Fallback to mock data for development if no real events
    if (events.length === 0) {
      console.log("[feed page] No events from subgraph, using mock data");
      const { generateMockFeedEvents } = await import("@/lib/mock-data/feed-events");
      return generateMockFeedEvents(24);
    }
    
    return events;
  } catch (error) {
    console.error("[feed page] Failed to fetch feed events:", error);
    // Fallback to mock data on error
    const { generateMockFeedEvents } = await import("@/lib/mock-data/feed-events");
    return generateMockFeedEvents(24);
  }
}

export default async function LiveFeedPage() {
  const events = await getFeedEvents();

  return (
    <div className="py-8 max-w-4xl mx-auto">
        {/* Page header */}
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Live Feed</h1>
          <p className="text-muted-foreground mt-1">
            Real-time activity from the Gnars DAO
          </p>
        </div>

        {/* Feed content */}
        <Suspense fallback={<LiveFeedView events={[]} isLoading />}>
          <LiveFeedView events={events} />
        </Suspense>

        {/* Info banner */}
        <div className="mt-8 p-4 rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Live events from the Gnars DAO on Base (last 30 days). Data refreshes automatically every 15 seconds.
          </p>
        </div>
      </div>
  );
}

