/**
 * GovernanceEventCard - Governance event display
 *
 * Handles proposal and voting related events with appropriate icons,
 * colors, and actions based on event type.
 */

"use client";

import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  MinusCircle,
  ShieldX,
  Target,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { extractFirstMedia, stripMarkdown } from "@/lib/markdown-media";
import type { FeedEvent } from "@/lib/types/feed-events";
import { cn } from "@/lib/utils";

export interface GovernanceEventCardProps {
  event: Extract<FeedEvent, { category: "governance" }>;
  compact?: boolean;
  sequenceNumber?: number;
}

export function GovernanceEventCard({ event, compact, sequenceNumber }: GovernanceEventCardProps) {
  const t = useTranslations("feed");
  // Event icon and color based on type
  const { icon: Icon, iconColor, bgColor, title, actionText } = getEventDisplay(event, t);

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
                {event.type === "VoteCast" ? (
                  <p className="text-sm font-medium">
                    {t.rich("events.governance.voteCast", {
                      number: event.proposalNumber,
                      link: (chunks) => (
                        <Link
                          href={`/proposals/${event.proposalNumber}`}
                          className="underline hover:opacity-80"
                        >
                          {chunks}
                        </Link>
                      ),
                    })}
                  </p>
                ) : (
                  <p className="text-sm font-medium">{title}</p>
                )}
              </div>
            </div>

            {/* Event-specific content */}
            {event.type === "ProposalCreated" && <ProposalCreatedContent event={event} />}
            {event.type === "VoteCast" && <VoteCastContent event={event} compact={compact} />}
            {(event.type === "ProposalQueued" ||
              event.type === "ProposalExecuted" ||
              event.type === "ProposalCanceled" ||
              event.type === "ProposalVetoed") && <ProposalStatusContent event={event} />}
            {(event.type === "VotingOpened" || event.type === "VotingClosingSoon") && (
              <VotingAlertContent event={event} />
            )}
            {event.type === "ProposalUpdated" && <ProposalUpdatedContent event={event} />}

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

function ProposalCreatedContent({
  event,
}: {
  event: Extract<FeedEvent, { type: "ProposalCreated" }>;
}) {
  const t = useTranslations("feed");
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
        {t("events.governance.votingStarts", {
          time: formatDistanceToNow(new Date(event.voteStart * 1000), { addSuffix: true }),
        })}
      </div>
    </div>
  );
}

function VoteCastContent({
  event,
  compact,
}: {
  event: Extract<FeedEvent, { type: "VoteCast" }>;
  compact?: boolean;
}) {
  const t = useTranslations("feed");
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
        <span className="text-xs text-muted-foreground">{t("events.governance.voted")}</span>
        <span
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            config.bg,
            "px-2 py-0.5 rounded-md",
          )}
        >
          <SupportIcon className={cn("h-3 w-3", config.color)} />
          {event.support}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("events.governance.withVotes", { count: event.weight })}
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

function ProposalStatusContent({
  event,
}: {
  event: Extract<
    FeedEvent,
    { type: "ProposalQueued" | "ProposalExecuted" | "ProposalCanceled" | "ProposalVetoed" }
  >;
}) {
  const t = useTranslations("feed");
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">
        Proposal #{event.proposalNumber}: {event.proposalTitle}
      </p>
      {event.type === "ProposalQueued" && (
        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
          {t("events.governance.readyForExecution", {
            time: formatDistanceToNow(new Date(event.eta * 1000), { addSuffix: true }),
          })}
        </p>
      )}
    </div>
  );
}

function ProposalUpdatedContent({
  event,
}: {
  event: Extract<FeedEvent, { type: "ProposalUpdated" }>;
}) {
  const t = useTranslations("feed");
  // Builder propdate enum: 0 = original/update, 1 = reply. Anything else
  // falls back to "update" wording so future enum additions don't crash.
  const isReply = event.messageType === 1;
  const media = extractFirstMedia(event.message);
  const snippet = stripMarkdown(event.message ?? "", 160);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>
          {isReply ? t("events.governance.replyFrom") : t("events.governance.updateFrom")}
        </span>
        <AddressDisplay
          address={event.proposer}
          variant="compact"
          showAvatar={true}
          avatarSize="xs"
          showENS={true}
          showCopy={false}
          showExplorer={false}
        />
        <span>{t("events.governance.on")}</span>
        <Link href={`/proposals/${event.proposalNumber}`} className="underline hover:opacity-80">
          Proposal #{event.proposalNumber}
        </Link>
      </div>
      {(media || snippet) && (
        <div className="flex gap-2 border-l-2 border-muted pl-2">
          {media?.kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.url}
              alt=""
              loading="lazy"
              className="h-16 w-16 flex-shrink-0 rounded-md border object-cover"
            />
          )}
          {media?.kind === "video" && (
            <video
              src={media.url}
              muted
              playsInline
              preload="metadata"
              className="h-16 w-16 flex-shrink-0 rounded-md border object-cover"
            />
          )}
          {snippet && (
            <p className="text-xs italic text-muted-foreground line-clamp-3">{snippet}</p>
          )}
        </div>
      )}
    </div>
  );
}

function VotingAlertContent({
  event,
}: {
  event: Extract<FeedEvent, { type: "VotingOpened" | "VotingClosingSoon" }>;
}) {
  const t = useTranslations("feed");
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">
        Proposal #{event.proposalNumber}: {event.proposalTitle}
      </p>
      <p className="text-xs text-muted-foreground" suppressHydrationWarning>
        {event.type === "VotingOpened"
          ? formatDistanceToNow(new Date(event.voteEnd * 1000), { addSuffix: true })
          : t("events.auction.minutesLeft", { count: event.hoursLeft })}
      </p>
    </div>
  );
}

// Helper functions

type TFunc = ReturnType<typeof useTranslations<"feed">>;

function getEventDisplay(event: Extract<FeedEvent, { category: "governance" }>, t: TFunc) {
  switch (event.type) {
    case "ProposalCreated":
      return {
        icon: Target,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950",
        title: t("events.governance.newProposal"),
        actionText: t("events.governance.viewProposal"),
      };
    case "VoteCast":
      return {
        icon:
          event.support === "FOR"
            ? ThumbsUp
            : event.support === "AGAINST"
              ? ThumbsDown
              : MinusCircle,
        iconColor:
          event.support === "FOR"
            ? "text-green-600"
            : event.support === "AGAINST"
              ? "text-red-600"
              : "text-gray-600",
        bgColor:
          event.support === "FOR"
            ? "bg-green-50 dark:bg-green-950"
            : event.support === "AGAINST"
              ? "bg-red-50 dark:bg-red-950"
              : "bg-gray-50 dark:bg-gray-950",
        title: t("events.governance.voteCast", { number: event.proposalNumber }),
        actionText: t("events.governance.viewProposal"),
      };
    case "ProposalQueued":
      return {
        icon: Clock,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-950",
        title: t("events.governance.proposalQueued"),
        actionText: t("events.governance.viewProposal"),
      };
    case "ProposalExecuted":
      return {
        icon: CheckCircle,
        iconColor: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950",
        title: t("events.governance.proposalExecuted"),
        actionText: t("events.governance.viewProposal"),
      };
    case "ProposalCanceled":
      return {
        icon: XCircle,
        iconColor: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-950",
        title: t("events.governance.proposalCanceled"),
        actionText: t("events.governance.viewProposal"),
      };
    case "ProposalVetoed":
      return {
        icon: ShieldX,
        iconColor: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-950",
        title: t("events.governance.proposalVetoed"),
        actionText: t("events.governance.viewProposal"),
      };
    case "VotingOpened":
      return {
        icon: AlertCircle,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950",
        title: t("events.governance.votingOpened"),
        actionText: t("events.governance.castVote"),
      };
    case "VotingClosingSoon":
      return {
        icon: AlertCircle,
        iconColor: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-950",
        title: t("events.governance.votingClosingSoon"),
        actionText: t("events.governance.castVote"),
      };
    case "ProposalUpdated":
      return {
        icon: MessageSquare,
        iconColor: "text-indigo-600",
        bgColor: "bg-indigo-50 dark:bg-indigo-950",
        title: t("events.governance.proposalUpdated", { number: event.proposalNumber }),
        actionText: t("events.governance.viewPropdate"),
      };
  }
}

function getEventLink(event: Extract<FeedEvent, { category: "governance" }>): string {
  if (event.type === "ProposalUpdated") {
    return `/propdates/${event.transactionHash}`;
  }
  if ("proposalNumber" in event) {
    return `/proposals/${event.proposalNumber}`;
  }
  return "/proposals";
}
