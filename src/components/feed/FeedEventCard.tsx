/**
 * FeedEventCard - Main event card component
 * 
 * Displays individual feed events with appropriate styling and actions.
 * Routes to specific event card components based on event type.
 */

"use client";

import { FeedEvent } from "@/lib/types/feed-events";
import { GovernanceEventCard } from "./GovernanceEventCard";
import { AuctionEventCard } from "./AuctionEventCard";
import { TokenEventCard } from "./TokenEventCard";
import { AdminEventCard } from "./AdminEventCard";

export interface FeedEventCardProps {
  event: FeedEvent;
  compact?: boolean;
}

export function FeedEventCard({ event, compact = false }: FeedEventCardProps) {
  // Route to appropriate card component based on event category
  switch (event.category) {
    case "governance":
      return <GovernanceEventCard event={event} compact={compact} />;
    case "auction":
      return <AuctionEventCard event={event} compact={compact} />;
    case "token":
    case "delegation":
      return <TokenEventCard event={event} compact={compact} />;
    case "treasury":
    case "admin":
    case "settings":
      return <AdminEventCard event={event} compact={compact} />;
    default:
      return null;
  }
}

