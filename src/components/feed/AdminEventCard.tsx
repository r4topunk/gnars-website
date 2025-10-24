/**
 * AdminEventCard - Administrative event display
 * 
 * Handles treasury, settings, and admin events.
 */

"use client";

import Link from "next/link";
import { Settings, Crown, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddressDisplay } from "@/components/ui/address-display";
import { cn } from "@/lib/utils";
import { formatETH } from "@/lib/utils";
import type { FeedEvent } from "@/lib/types/feed-events";

export interface AdminEventCardProps {
  event: Extract<FeedEvent, { category: "treasury" | "admin" | "settings" }>;
  compact?: boolean;
}

export function AdminEventCard({ event, compact }: AdminEventCardProps) {
  // Removed: timeAgo is redundant since we have day headers
  
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
              </div>
              {event.priority === "MEDIUM" && event.category === "admin" && (
                <Badge variant="secondary" className="text-xs">Admin</Badge>
              )}
            </div>

            {/* Event-specific content */}
            {event.type === "TreasuryTransaction" && (
              <TreasuryTransactionContent event={event} />
            )}
            {event.type === "SettingsUpdated" && (
              <SettingsUpdatedContent event={event} />
            )}
            {event.type === "OwnershipTransferred" && (
              <OwnershipTransferredContent event={event} />
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

function TreasuryTransactionContent({ event }: { event: Extract<FeedEvent, { type: "TreasuryTransaction" }> }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-muted-foreground">Sent</span>
        <span className="text-sm font-bold text-green-600">
          {formatETH(event.amount)}
        </span>
        <span className="text-xs text-muted-foreground">to</span>
        <AddressDisplay 
          address={event.recipient}
          variant="compact"
          showAvatar={false}
          showENS={true}
          showCopy={false}
          showExplorer={false}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Proposal #{event.proposalNumber}
      </p>
    </div>
  );
}

function SettingsUpdatedContent({ event }: { event: Extract<FeedEvent, { type: "SettingsUpdated" }> }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{event.setting}</p>
      <p className="text-xs text-muted-foreground">
        Updated: {event.oldValue} → {event.newValue}
      </p>
    </div>
  );
}

function OwnershipTransferredContent({ event }: { event: Extract<FeedEvent, { type: "OwnershipTransferred" }> }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground capitalize">{event.contract} Contract</p>
      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        <AddressDisplay 
          address={event.previousOwner}
          variant="compact"
          showAvatar={false}
          showENS={true}
          showCopy={false}
          showExplorer={false}
        />
        <span className="text-muted-foreground">→</span>
        <AddressDisplay 
          address={event.newOwner}
          variant="compact"
          showAvatar={false}
          showENS={true}
          showCopy={false}
          showExplorer={false}
        />
      </div>
    </div>
  );
}

// Helper functions

function getEventDisplay(event: Extract<FeedEvent, { category: "treasury" | "admin" | "settings" }>) {
  switch (event.type) {
    case "TreasuryTransaction":
      return {
        icon: Send,
        iconColor: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950",
        title: "Treasury Transaction",
        actionText: "View Transaction",
      };
    case "SettingsUpdated":
      return {
        icon: Settings,
        iconColor: "text-gray-600",
        bgColor: "bg-gray-50 dark:bg-gray-950",
        title: "Settings Updated",
        actionText: null,
      };
    case "OwnershipTransferred":
      return {
        icon: Crown,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-950",
        title: "Ownership Transferred",
        actionText: "View Details",
      };
  }
}

function getEventLink(event: Extract<FeedEvent, { category: "treasury" | "admin" | "settings" }>): string {
  if (event.type === "TreasuryTransaction") {
    return `/proposals/${event.proposalNumber}`;
  }
  return "/treasury";
}

