/**
 * AuctionEventCard - Auction event display
 *
 * Displays auction-related events including bids, settlements, and alerts.
 */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { Clock, DollarSign, Palette, Radio, Trophy } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TokenImage } from "@/components/ui/token-image";
import { useBidComments } from "@/hooks/use-bid-comments";
import { Link } from "@/i18n/navigation";
import type { FeedEvent } from "@/lib/types/feed-events";
import { cn, formatETH } from "@/lib/utils";

export interface AuctionEventCardProps {
  event: Extract<FeedEvent, { category: "auction" }>;
  compact?: boolean;
  sequenceNumber?: number;
}

export function AuctionEventCard({ event, compact, sequenceNumber }: AuctionEventCardProps) {
  const t = useTranslations("feed");
  const { icon: Icon, iconColor, bgColor, title, actionText } = getEventDisplay(event, t);

  // Determine if auction is currently live — intentional render-time clock read.
  // eslint-disable-next-line react-hooks/purity
  const now = Math.floor(Date.now() / 1000);
  const isLive = event.type === "AuctionCreated" && event.endTime > now;

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
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{title}</p>
                  {event.type === "AuctionBid" && (
                    <span className="text-xs text-muted-foreground">on #{event.tokenId}</span>
                  )}
                </div>
              </div>
              {isLive && (
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-md",
                  )}
                >
                  <Radio className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">{t("events.auction.live")}</span>
                </span>
              )}
            </div>

            {/* Event-specific content */}
            {event.type === "AuctionCreated" && <AuctionCreatedContent event={event} />}
            {event.type === "AuctionBid" && <AuctionBidContent event={event} compact={compact} />}
            {event.type === "AuctionSettled" && <AuctionSettledContent event={event} />}
            {event.type === "AuctionEndingSoon" && <AuctionEndingSoonContent event={event} />}

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

function AuctionCreatedContent({
  event,
}: {
  event: Extract<FeedEvent, { type: "AuctionCreated" }>;
}) {
  const t = useTranslations("feed");
  // Intentional render-time clock read for relative-time label (hydration suppressed).
  // eslint-disable-next-line react-hooks/purity
  const now = Math.floor(Date.now() / 1000);
  const hasEnded = event.endTime <= now;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">#{event.tokenId}</p>
      <p className="text-xs text-muted-foreground" suppressHydrationWarning>
        {hasEnded
          ? t("events.auction.ended", {
              time: formatDistanceToNow(new Date(event.endTime * 1000), { addSuffix: true }),
            })
          : t("events.auction.ends", {
              time: formatDistanceToNow(new Date(event.endTime * 1000), { addSuffix: true }),
            })}
      </p>
      {event.imageUrl && <TokenImage src={event.imageUrl} tokenId={event.tokenId} size={96} />}
    </div>
  );
}

function AuctionBidContent({
  event,
  compact,
}: {
  event: Extract<FeedEvent, { type: "AuctionBid" }>;
  compact?: boolean;
}) {
  const t = useTranslations("feed");
  const increase = event.previousBid
    ? (
        ((parseFloat(event.amount) - parseFloat(event.previousBid)) /
          parseFloat(event.previousBid)) *
        100
      ).toFixed(1)
    : null;

  // Decode on-chain comment from TX calldata
  const txHashes = useMemo(() => [event.transactionHash], [event.transactionHash]);
  const { comments } = useBidComments(txHashes);
  const comment = comments.get(event.transactionHash);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <AddressDisplay
          address={event.bidder}
          variant="compact"
          showAvatar={true}
          avatarSize="xs"
          showENS={true}
          showCopy={false}
          showExplorer={false}
        />
        <span className="text-xs text-muted-foreground">{t("events.auction.bid")}</span>
        <span className="text-sm font-bold text-green-600">{formatETH(event.amount)}</span>
        {increase && <span className="text-xs text-muted-foreground">(+{increase}%)</span>}
      </div>
      {comment && (
        <p className="text-xs text-muted-foreground italic pl-1">&ldquo;{comment}&rdquo;</p>
      )}
      {event.extended && !compact && (
        <Badge variant="secondary" className="text-xs">
          {t("events.auction.auctionExtended")}
        </Badge>
      )}
      {event.imageUrl && <TokenImage src={event.imageUrl} tokenId={event.tokenId} size={96} />}
    </div>
  );
}

function AuctionSettledContent({
  event,
}: {
  event: Extract<FeedEvent, { type: "AuctionSettled" }>;
}) {
  const t = useTranslations("feed");
  const isZeroAddress =
    !event.winner ||
    event.winner === "0x0000000000000000000000000000000000000000" ||
    event.winner === "0x0";

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">#{event.tokenId}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{t("events.auction.wonBy")}</span>
        {isZeroAddress ? (
          <span className="text-xs text-muted-foreground">{t("events.auction.unknown")}</span>
        ) : (
          <AddressDisplay
            address={event.winner}
            variant="compact"
            showAvatar={true}
            avatarSize="xs"
            showENS={true}
            showCopy={false}
            showExplorer={false}
          />
        )}
        <span className="text-xs text-muted-foreground">{t("events.auction.for")}</span>
        <span className="text-sm font-bold text-green-600">{formatETH(event.amount)}</span>
      </div>
      {event.imageUrl && <TokenImage src={event.imageUrl} tokenId={event.tokenId} size={96} />}
    </div>
  );
}

function AuctionEndingSoonContent({
  event,
}: {
  event: Extract<FeedEvent, { type: "AuctionEndingSoon" }>;
}) {
  const t = useTranslations("feed");
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">#{event.tokenId}</p>
      <div className="flex items-center gap-1.5">
        <Badge variant="destructive" className="text-xs">
          {t("events.auction.minutesLeft", { count: event.minutesLeft })}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {t("events.auction.current", { amount: formatETH(event.currentBid) })}
        </span>
      </div>
      {event.imageUrl && <TokenImage src={event.imageUrl} tokenId={event.tokenId} size={96} />}
    </div>
  );
}

// Helper functions

type TFunc = ReturnType<typeof useTranslations<"feed">>;

function getEventDisplay(event: Extract<FeedEvent, { category: "auction" }>, t: TFunc) {
  switch (event.type) {
    case "AuctionCreated":
      return {
        icon: Palette,
        iconColor: "text-purple-600",
        bgColor: "bg-purple-50 dark:bg-purple-950",
        title: t("events.auction.auction"),
        actionText: t("events.auction.viewAuction"),
      };
    case "AuctionBid":
      return {
        icon: DollarSign,
        iconColor: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950",
        title: t("events.auction.bid"),
        actionText: t("events.auction.viewAuction"),
      };
    case "AuctionSettled":
      return {
        icon: Trophy,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-950",
        title: t("events.auction.auctionWon"),
        actionText: t("events.auction.viewToken"),
      };
    case "AuctionEndingSoon":
      return {
        icon: Clock,
        iconColor: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-950",
        title: t("events.auction.auctionEndingSoon"),
        actionText: t("events.auction.placeBid"),
      };
  }
}

function getEventLink(event: Extract<FeedEvent, { category: "auction" }>): string {
  // For AuctionCreated, go to home if auction hasn't ended, otherwise go to auctions page
  if (event.type === "AuctionCreated") {
    const now = Math.floor(Date.now() / 1000);
    const hasEnded = event.endTime <= now;
    return hasEnded ? "/auctions" : "/";
  }

  return "/auctions";
}
