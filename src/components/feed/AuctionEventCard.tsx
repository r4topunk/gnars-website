/**
 * AuctionEventCard - Auction event display
 * 
 * Displays auction-related events including bids, settlements, and alerts.
 */

"use client";

import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Palette, DollarSign, Trophy, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddressDisplay } from "@/components/ui/address-display";
import { cn } from "@/lib/utils";
import { formatETH } from "@/lib/utils";
import type { FeedEvent } from "@/lib/types/feed-events";

export interface AuctionEventCardProps {
  event: Extract<FeedEvent, { category: "auction" }>;
  compact?: boolean;
}

export function AuctionEventCard({ event, compact }: AuctionEventCardProps) {
  const timeAgo = formatDistanceToNow(new Date(event.timestamp * 1000), { addSuffix: true });
  
  const { icon: Icon, iconColor, bgColor, title, actionText } = getEventDisplay(event);

  return (
    <Card className={cn(
      "transition-shadow hover:shadow-md",
      compact ? "py-3" : "py-4"
    )}>
      <CardContent className={cn(compact ? "px-4 py-2" : "px-4")}>
        <div className="flex items-start gap-3">
          {/* Event icon */}
          <div className={cn(
            "flex-shrink-0 rounded-full p-2",
            bgColor
          )}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>

          {/* Event content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
              </div>
              {event.priority === "HIGH" && (
                <Badge variant="outline" className="text-xs">Live</Badge>
              )}
            </div>

            {/* Event-specific content */}
            {event.type === "AuctionCreated" && (
              <AuctionCreatedContent event={event} />
            )}
            {event.type === "AuctionBid" && (
              <AuctionBidContent event={event} compact={compact} />
            )}
            {event.type === "AuctionSettled" && (
              <AuctionSettledContent event={event} />
            )}
            {event.type === "AuctionEndingSoon" && (
              <AuctionEndingSoonContent event={event} />
            )}

            {/* Action button */}
            {actionText && (
              <div className="pt-1">
                <Link 
                  href={getEventLink(event)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {actionText} →
                </Link>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Subcomponents

function AuctionCreatedContent({ event }: { event: Extract<FeedEvent, { type: "AuctionCreated" }> }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Gnar #{event.tokenId}</p>
      <p className="text-xs text-muted-foreground">
        Ends {formatDistanceToNow(new Date(event.endTime * 1000), { addSuffix: true })}
      </p>
      {event.imageUrl && (
        <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted relative">
          <Image
            src={event.imageUrl}
            alt={`Gnar #${event.tokenId}`}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>
      )}
    </div>
  );
}

function AuctionBidContent({ event, compact }: { 
  event: Extract<FeedEvent, { type: "AuctionBid" }>; 
  compact?: boolean;
}) {
  const increase = event.previousBid 
    ? ((parseFloat(event.amount) - parseFloat(event.previousBid)) / parseFloat(event.previousBid) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <AddressDisplay 
          address={event.bidder}
          variant="compact"
          showAvatar={false}
          showENS={true}
          showCopy={false}
          showExplorer={false}
        />
        <span className="text-xs text-muted-foreground">bid</span>
        <span className="text-sm font-bold text-green-600">
          {formatETH(event.amount)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        on Gnar #{event.tokenId}
        {increase && ` (+${increase}%)`}
      </p>
      {event.extended && !compact && (
        <Badge variant="secondary" className="text-xs">
          ⏱️ Auction Extended
        </Badge>
      )}
      {event.imageUrl && (
        <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted relative">
          <Image
            src={event.imageUrl}
            alt={`Gnar #${event.tokenId}`}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>
      )}
    </div>
  );
}

function AuctionSettledContent({ event }: { event: Extract<FeedEvent, { type: "AuctionSettled" }> }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Gnar #{event.tokenId}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">won by</span>
        <AddressDisplay 
          address={event.winner}
          variant="compact"
          showAvatar={false}
          showENS={true}
          showCopy={false}
          showExplorer={false}
        />
        <span className="text-xs text-muted-foreground">for</span>
        <span className="text-sm font-bold text-green-600">
          {formatETH(event.amount)}
        </span>
      </div>
      {event.imageUrl && (
        <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted relative">
          <Image
            src={event.imageUrl}
            alt={`Gnar #${event.tokenId}`}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>
      )}
    </div>
  );
}

function AuctionEndingSoonContent({ event }: { event: Extract<FeedEvent, { type: "AuctionEndingSoon" }> }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Gnar #{event.tokenId}</p>
      <div className="flex items-center gap-1.5">
        <Badge variant="destructive" className="text-xs">
          {event.minutesLeft}m left!
        </Badge>
        <span className="text-xs text-muted-foreground">
          Current: {formatETH(event.currentBid)}
        </span>
      </div>
      {event.imageUrl && (
        <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted relative">
          <Image
            src={event.imageUrl}
            alt={`Gnar #${event.tokenId}`}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>
      )}
    </div>
  );
}

// Helper functions

function getEventDisplay(event: Extract<FeedEvent, { category: "auction" }>) {
  switch (event.type) {
    case "AuctionCreated":
      return {
        icon: Palette,
        iconColor: "text-purple-600",
        bgColor: "bg-purple-50 dark:bg-purple-950",
        title: "New Auction",
        actionText: "View Auction",
      };
    case "AuctionBid":
      return {
        icon: DollarSign,
        iconColor: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950",
        title: "New Bid",
        actionText: "View Auction",
      };
    case "AuctionSettled":
      return {
        icon: Trophy,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-950",
        title: "Auction Won",
        actionText: "View Token",
      };
    case "AuctionEndingSoon":
      return {
        icon: Clock,
        iconColor: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-950",
        title: "Auction Ending Soon",
        actionText: "Place Bid",
      };
  }
}

function getEventLink(_event: Extract<FeedEvent, { category: "auction" }>): string {
  return "/auctions";
}

