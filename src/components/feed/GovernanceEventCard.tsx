/**
 * GovernanceEventCard - Governance event display
 * 
 * Handles proposal and voting related events with appropriate icons,
 * colors, and actions based on event type.
 */

"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { 
  Target, 
  ThumbsUp, 
  ThumbsDown, 
  MinusCircle,
  Clock,
  CheckCircle,
  XCircle,
  ShieldX,
  AlertCircle 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AddressDisplay } from "@/components/ui/address-display";
import { cn } from "@/lib/utils";
import type { FeedEvent } from "@/lib/types/feed-events";

export interface GovernanceEventCardProps {
  event: Extract<FeedEvent, { category: "governance" }>;
  compact?: boolean;
  sequenceNumber?: number;
}

export function GovernanceEventCard({ event, compact, sequenceNumber }: GovernanceEventCardProps) {
  // Removed: timeAgo is redundant since we have day headers
  
  // Event icon and color based on type
  const { icon: Icon, iconColor, bgColor, title, actionText } = getEventDisplay(event);

  return (
    <Card className={cn(
      "transition-shadow hover:shadow-md relative",
      compact ? "py-3" : "py-4"
    )}>
      <CardContent className={cn(compact ? "px-4 py-2" : "px-4")}>
        {/* Sequence number badge */}
        {sequenceNumber !== undefined && (
          <div className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
            {sequenceNumber}
          </div>
        )}
        
        <div className="flex items-start gap-3">
          {/* Event icon */}
          <div className={cn(
            "flex-shrink-0 rounded-full p-2",
            bgColor
          )}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>

          {/* Event content */}
          <div className="flex-1 min-w-0 space-y-2 pr-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {event.type === "VoteCast" ? (
                  <p className="text-sm font-medium">
                    Vote on{" "}
                    <Link 
                      href={`/proposals/${event.proposalNumber}`}
                      className="underline hover:opacity-80"
                    >
                      Proposal #{event.proposalNumber}
                    </Link>
                  </p>
                ) : (
                  <p className="text-sm font-medium">{title}</p>
                )}
              </div>
            </div>

            {/* Event-specific content */}
            {event.type === "ProposalCreated" && (
              <ProposalCreatedContent event={event} />
            )}
            {event.type === "VoteCast" && (
              <VoteCastContent event={event} compact={compact} />
            )}
            {(event.type === "ProposalQueued" || 
              event.type === "ProposalExecuted" || 
              event.type === "ProposalCanceled" ||
              event.type === "ProposalVetoed") && (
              <ProposalStatusContent event={event} />
            )}
            {(event.type === "VotingOpened" || event.type === "VotingClosingSoon") && (
              <VotingAlertContent event={event} />
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

// Subcomponents for different event types

function ProposalCreatedContent({ event }: { event: Extract<FeedEvent, { type: "ProposalCreated" }> }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold line-clamp-2">{event.title}</p>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>by</span>
        <AddressDisplay 
          address={event.proposer}
          variant="compact"
          showAvatar={true}
          avatarSize="xs"
          showENS={true}
          showCopy={false}
          showExplorer={false}
        />
      </div>
      <div className="text-xs text-muted-foreground" suppressHydrationWarning>
        Voting starts {formatDistanceToNow(new Date(event.voteStart * 1000), { addSuffix: true })}
      </div>
    </div>
  );
}

function VoteCastContent({ event, compact }: { 
  event: Extract<FeedEvent, { type: "VoteCast" }>; 
  compact?: boolean;
}) {
  const supportConfig = {
    FOR: { icon: ThumbsUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
    AGAINST: { icon: ThumbsDown, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
    ABSTAIN: { icon: MinusCircle, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-950" },
  };
  
  const config = supportConfig[event.support];
  const SupportIcon = config.icon;
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <AddressDisplay 
          address={event.voter}
          variant="compact"
          showAvatar={true}
          avatarSize="xs"
          showENS={true}
          showCopy={false}
          showExplorer={false}
        />
        <span className="text-xs text-muted-foreground">voted</span>
        <span className={cn("flex items-center gap-1 text-xs font-medium", config.bg, "px-2 py-0.5 rounded-md")}>
          <SupportIcon className={cn("h-3 w-3", config.color)} />
          {event.support}
        </span>
        <span className="text-xs text-muted-foreground">
          with {event.weight} votes
        </span>
      </div>
      <p className="text-xs font-medium line-clamp-1">{event.proposalTitle}</p>
      {event.reason && !compact && (
        <p className="text-xs italic text-muted-foreground border-l-2 border-muted pl-2 mt-2 line-clamp-2">
          &ldquo;{event.reason}&rdquo;
        </p>
      )}
    </div>
  );
}

function ProposalStatusContent({ event }: { 
  event: Extract<FeedEvent, { type: "ProposalQueued" | "ProposalExecuted" | "ProposalCanceled" | "ProposalVetoed" }> 
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">
        Proposal #{event.proposalNumber}: {event.proposalTitle}
      </p>
      {event.type === "ProposalQueued" && (
        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
          Ready for execution {formatDistanceToNow(new Date(event.eta * 1000), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}

function VotingAlertContent({ event }: { 
  event: Extract<FeedEvent, { type: "VotingOpened" | "VotingClosingSoon" }> 
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">
        Proposal #{event.proposalNumber}: {event.proposalTitle}
      </p>
      <p className="text-xs text-muted-foreground" suppressHydrationWarning>
        {event.type === "VotingOpened" 
          ? `Voting ends ${formatDistanceToNow(new Date(event.voteEnd * 1000), { addSuffix: true })}`
          : `Only ${event.hoursLeft}h left to vote!`
        }
      </p>
    </div>
  );
}

// Helper functions

function getEventDisplay(event: Extract<FeedEvent, { category: "governance" }>) {
  switch (event.type) {
    case "ProposalCreated":
      return {
        icon: Target,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950",
        title: "New Proposal",
        actionText: "View Proposal",
      };
    case "VoteCast":
      return {
        icon: event.support === "FOR" ? ThumbsUp : event.support === "AGAINST" ? ThumbsDown : MinusCircle,
        iconColor: event.support === "FOR" ? "text-green-600" : event.support === "AGAINST" ? "text-red-600" : "text-gray-600",
        bgColor: event.support === "FOR" ? "bg-green-50 dark:bg-green-950" : event.support === "AGAINST" ? "bg-red-50 dark:bg-red-950" : "bg-gray-50 dark:bg-gray-950",
        title: `Vote on Proposal #${event.proposalNumber}`,
        actionText: "View Proposal",
      };
    case "ProposalQueued":
      return {
        icon: Clock,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-950",
        title: "Proposal Queued",
        actionText: "View Proposal",
      };
    case "ProposalExecuted":
      return {
        icon: CheckCircle,
        iconColor: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950",
        title: "Proposal Executed",
        actionText: "View Proposal",
      };
    case "ProposalCanceled":
      return {
        icon: XCircle,
        iconColor: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-950",
        title: "Proposal Canceled",
        actionText: "View Proposal",
      };
    case "ProposalVetoed":
      return {
        icon: ShieldX,
        iconColor: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-950",
        title: "Proposal Vetoed",
        actionText: "View Proposal",
      };
    case "VotingOpened":
      return {
        icon: AlertCircle,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950",
        title: "Voting Opened",
        actionText: "Cast Vote",
      };
    case "VotingClosingSoon":
      return {
        icon: AlertCircle,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-950",
        title: "Voting Closing Soon",
        actionText: "Cast Vote",
      };
  }
}

function getEventLink(event: Extract<FeedEvent, { category: "governance" }>): string {
  if ("proposalNumber" in event) {
    return `/proposals/${event.proposalNumber}`;
  }
  return "/proposals";
}

