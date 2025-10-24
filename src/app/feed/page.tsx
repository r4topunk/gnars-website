/**
 * Live Feed Page
 * 
 * Displays real-time DAO activity feed with all governance, auction, and token events.
 * Uses mock data for now - replace with actual data fetching in production.
 */

import { Suspense } from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { LiveFeedView } from "@/components/feed/LiveFeedView";
import { generateMockFeedEvents } from "@/lib/mock-data/feed-events";
import { Activity } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Fetch feed events
 * 
 * TODO: Replace with actual data fetching from:
 * - The Graph subgraph for historical events
 * - WebSocket connection for real-time updates
 * - Backend API for computed events (voting alerts, etc.)
 */
async function getFeedEvents() {
  try {
    // Mock data for development
    // In production, fetch from actual data sources:
    // return await fetchFeedEventsFromSubgraph();
    return generateMockFeedEvents(24);
  } catch (error) {
    console.error("Failed to fetch feed events:", error);
    return [];
  }
}

export default async function LiveFeedPage() {
  const events = await getFeedEvents();

  return (
    <SidebarInset>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Page header */}
        <div className="space-y-2 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Live Feed</h1>
              <p className="text-muted-foreground mt-1">
                Real-time activity from the Gnars DAO
              </p>
            </div>
          </div>
        </div>

        {/* Feed content */}
        <Suspense fallback={<LiveFeedView events={[]} isLoading />}>
          <LiveFeedView events={events} />
        </Suspense>

        {/* Info banner */}
        <div className="mt-8 p-4 rounded-lg border bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Currently showing mock data for development.
            In production, this feed will display real-time events from the blockchain
            including proposals, votes, auctions, and token activities.
          </p>
        </div>
      </div>
    </SidebarInset>
  );
}

