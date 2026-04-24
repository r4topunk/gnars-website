/**
 * TokenEventCard - Token and delegation event display
 *
 * Handles token mints, transfers, and delegation changes.
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRightLeft, Palette, Sparkles, Users } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FeedEvent } from "@/lib/types/feed-events";
import { cn } from "@/lib/utils";

export interface TokenEventCardProps {
  event: Extract<FeedEvent, { category: "token" | "delegation" }>;
  compact?: boolean;
  sequenceNumber?: number;
}

export function TokenEventCard({ event, compact, sequenceNumber }: TokenEventCardProps) {
  // Check if token was burned (minted to zero address)
  const isBurned =
    event.type === "TokenMinted" &&
    (!event.recipient ||
      event.recipient === "0x0000000000000000000000000000000000000000" ||
      event.recipient === "0x0");

  const { icon: Icon, iconColor, bgColor, title, actionText } = getEventDisplay(event, isBurned);

  return (
    <Card className={cn("transition-shadow hover:shadow-md relative", compact ? "py-3" : "py-4")}>
      <CardContent className={cn(compact ? "px-4 py-2" : "px-4")}>
        {/* Sequence number badge */}
        {sequenceNumber !== undefined && (
          <div className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
            {sequenceNumber}
          </div>
        )}

        <div className="flex items-start gap-3">
          {/* Event icon */}
          <div className={cn("flex-shrink-0 rounded-full p-2", bgColor)}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>

          {/* Event content */}
          <div className="flex-1 min-w-0 space-y-2 pr-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{title}</p>
              </div>
            </div>

            {/* Event-specific content */}
            {event.type === "TokenMinted" && <TokenMintedContent event={event} />}
            {event.type === "TokenTransferred" && <TokenTransferredContent event={event} />}
            {event.type === "DelegateChanged" && <DelegateChangedContent event={event} />}
            {event.type === "ZoraDropCreated" && <ZoraDropCreatedContent event={event} />}

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

function TokenMintedContent({ event }: { event: Extract<FeedEvent, { type: "TokenMinted" }> }) {
  const isZeroAddress =
    !event.recipient ||
    event.recipient === "0x0000000000000000000000000000000000000000" ||
    event.recipient === "0x0";

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold">Gnar #{event.tokenId}</p>
      {isZeroAddress ? (
        <p className="text-xs text-muted-foreground">burned</p>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">minted to</span>
          <AddressDisplay
            address={event.recipient}
            variant="compact"
            showAvatar={true}
            avatarSize="xs"
            showENS={true}
            showCopy={false}
            showExplorer={false}
          />
          {event.isFounder && (
            <Badge variant="secondary" className="text-xs">
              Founder
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function TokenTransferredContent({
  event,
}: {
  event: Extract<FeedEvent, { type: "TokenTransferred" }>;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold">Gnar #{event.tokenId}</p>
      <div className="flex items-center gap-1.5 flex-wrap text-xs">
        <AddressDisplay
          address={event.from}
          variant="compact"
          showAvatar={true}
          avatarSize="xs"
          showENS={true}
          showCopy={false}
          showExplorer={false}
        />
        <span className="text-muted-foreground">→</span>
        <AddressDisplay
          address={event.to}
          variant="compact"
          showAvatar={true}
          avatarSize="xs"
          showENS={true}
          showCopy={false}
          showExplorer={false}
        />
      </div>
    </div>
  );
}

function DelegateChangedContent({
  event,
}: {
  event: Extract<FeedEvent, { type: "DelegateChanged" }>;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <AddressDisplay
          address={event.delegator}
          variant="compact"
          showAvatar={true}
          avatarSize="xs"
          showENS={true}
          showCopy={false}
          showExplorer={false}
        />
        <span className="text-xs text-muted-foreground">delegated to</span>
        <AddressDisplay
          address={event.toDelegate}
          variant="compact"
          showAvatar={true}
          avatarSize="xs"
          showENS={true}
          showCopy={false}
          showExplorer={false}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {event.tokenCount} {event.tokenCount === 1 ? "vote" : "votes"}
      </p>
    </div>
  );
}

function ZoraDropCreatedContent({
  event,
}: {
  event: Extract<FeedEvent, { type: "ZoraDropCreated" }>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        {event.dropImageURI && (
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
            <Image
              src={event.dropImageURI}
              alt={event.dropName}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-semibold line-clamp-1">{event.dropName}</p>
          <p className="text-xs text-muted-foreground">
            {event.dropSymbol} · edition of {event.editionSize}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>by</span>
            <AddressDisplay
              address={event.dropCreator}
              variant="compact"
              showAvatar={true}
              avatarSize="xs"
              showENS={true}
              showCopy={false}
              showExplorer={false}
            />
          </div>
        </div>
      </div>
      {event.dropDescription && (
        <p className="text-xs text-muted-foreground line-clamp-2">{event.dropDescription}</p>
      )}
    </div>
  );
}

// Helper functions

function getEventDisplay(
  event: Extract<FeedEvent, { category: "token" | "delegation" }>,
  isBurned?: boolean,
) {
  switch (event.type) {
    case "TokenMinted":
      return {
        icon: Palette,
        iconColor: isBurned ? "text-red-600" : "text-purple-600",
        bgColor: isBurned ? "bg-red-50 dark:bg-red-950" : "bg-purple-50 dark:bg-purple-950",
        title: isBurned ? "Token Burned" : "Token Minted",
        actionText: "View Token",
      };
    case "TokenTransferred":
      return {
        icon: ArrowRightLeft,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950",
        title: "Token Transferred",
        actionText: "View Token",
      };
    case "DelegateChanged":
      return {
        icon: Users,
        iconColor: "text-indigo-600",
        bgColor: "bg-indigo-50 dark:bg-indigo-950",
        title: "Delegation Changed",
        actionText: "View Member",
      };
    case "ZoraDropCreated":
      return {
        icon: Sparkles,
        iconColor: "text-pink-600",
        bgColor: "bg-pink-50 dark:bg-pink-950",
        title: "New Droposal",
        actionText: "View Drop",
      };
  }
}

function getEventLink(event: Extract<FeedEvent, { category: "token" | "delegation" }>): string {
  if (event.type === "DelegateChanged") {
    return `/members/${event.toDelegate}`;
  }
  if (event.type === "ZoraDropCreated") {
    return `/droposals/${event.dropAddress}`;
  }
  return "/members";
}
