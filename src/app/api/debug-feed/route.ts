import { NextResponse } from "next/server";
import { getAllFeedEvents } from "@/services/feed-events";

export async function GET() {
  try {
    const events = await getAllFeedEvents(24 * 30); // 30 days

    const now = new Date();
    const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    
    // Group events by day
    const groups = new Map<number, typeof events>();
    
    events.forEach(event => {
      const date = new Date(event.timestamp * 1000);
      const dateKey = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(event);
    });

    // Convert to array with debug info
    const groupedWithDebug = Array.from(groups.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([dateKey, dayEvents]) => {
        const daysDiff = Math.round((nowUTC - dateKey) / (1000 * 60 * 60 * 24));
        
        return {
          dateKey,
          dateKeyDate: new Date(dateKey).toISOString(),
          daysDiff,
          label: daysDiff === 0 ? "Today" : daysDiff === 1 ? "Yesterday" : `${daysDiff} days ago`,
          eventCount: dayEvents.length,
          events: dayEvents.map(e => ({
            id: e.id,
            type: e.type,
            timestamp: e.timestamp,
            timestampDate: new Date(e.timestamp * 1000).toISOString(),
            timestampUTC: new Date(e.timestamp * 1000).toUTCString(),
            // Show which UTC day this event falls into
            eventUTCDate: (() => {
              const d = new Date(e.timestamp * 1000);
              return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
            })(),
          })),
        };
      });

    return NextResponse.json({
      success: true,
      now: now.toISOString(),
      nowUTC: new Date(nowUTC).toISOString(),
      nowUTCTimestamp: nowUTC,
      totalEvents: events.length,
      groups: groupedWithDebug,
    });
  } catch (error) {
    console.error("[debug-feed] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }, 
      { status: 500 }
    );
  }
}

