"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { FileText } from "lucide-react";
import { Markdown } from "@/components/common/Markdown";
import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import { AddressDisplay } from "@/components/ui/address-display";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { getDateFnsLocale } from "@/lib/i18n/format";
import type { ProposalStatus } from "@/lib/schemas/proposals";

// ---------------------------------------------------------------------------
// Types — the API returns JSON so dates are numbers and status is a string.
// ---------------------------------------------------------------------------

interface ProposalSummaryJSON {
  proposalId: string;
  proposalNumber: number;
  title: string;
  status: ProposalStatus;
  proposer: string;
}

interface PropdateJSON {
  txid: string;
  message: string;
  timeCreated: number;
  proposalId: string;
  attester: string;
  milestoneId: number | null;
  originalMessageId: string | null;
}

interface ProposalWithPropdatesJSON {
  proposal: ProposalSummaryJSON;
  propdates: PropdateJSON[];
  latestUpdate: number;
  updateCount: number;
}

// ---------------------------------------------------------------------------
// Individual feed card
// ---------------------------------------------------------------------------

interface ProposalUpdateCardProps {
  entry: ProposalWithPropdatesJSON;
  index: number;
}

function ProposalUpdateCard({ entry, index }: ProposalUpdateCardProps) {
  const t = useTranslations("propdates");
  const locale = useLocale();
  const { proposal, propdates, updateCount, latestUpdate } = entry;
  const latestPropdate = propdates[0];

  const timeAgo = formatDistanceToNow(new Date(latestUpdate * 1000), {
    addSuffix: true,
    locale: getDateFnsLocale(locale),
  });

  const proposalHref = `/proposals/base/${proposal.proposalNumber}`;
  const allUpdatesHref = `${proposalHref}?tab=propdates`;

  return (
    <div
      className="animate-in fade-in-0"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
    >
      <Card className="overflow-hidden transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-md">
        {/* Card header — proposal context */}
        <CardContent className="p-4 pb-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground tracking-wide">
              Prop #{proposal.proposalNumber}
            </span>
            <ProposalStatusBadge status={proposal.status} className="text-xs shrink-0" />
          </div>

          <Link
            href={proposalHref}
            className="mt-1 block text-sm font-semibold leading-snug hover:text-primary transition-colors line-clamp-2"
          >
            {proposal.title}
          </Link>

          <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <span>by</span>
            <AddressDisplay
              address={proposal.proposer}
              variant="compact"
              showAvatar={false}
              showCopy={false}
              showExplorer={false}
              avatarSize="xs"
              className="text-xs text-muted-foreground"
            />
          </div>
        </CardContent>

        {/* Divider */}
        <div className="mx-4 my-3 border-t" />

        {/* Latest update content */}
        <CardContent className="px-4 pt-0 pb-3">
          <p className="text-xs text-muted-foreground mb-2">
            {t("feed.latestUpdate")}&nbsp;·&nbsp;{timeAgo}
          </p>

          {latestPropdate && (
            <div
              className="rounded-md border bg-muted/40 p-3 relative overflow-hidden"
              style={{ maxHeight: 160 }}
            >
              <Markdown className="prose-sm">{latestPropdate.message}</Markdown>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="mx-4 border-t" />
        <CardContent className="px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              {updateCount === 1
                ? t("feed.update", { count: 1 })
                : t("feed.updates", { count: updateCount })}
            </span>
            <Link
              href={allUpdatesHref}
              className="text-xs font-medium text-primary hover:underline transition-colors"
            >
              {t("feed.viewAll")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feed skeleton matching the new card layout
// ---------------------------------------------------------------------------

function EnrichedFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading propdates feed">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-in fade-in-0"
          style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-4 pb-0">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="mt-2 h-4 w-3/4" />
              <Skeleton className="mt-1.5 h-3 w-32" />
            </CardContent>
            <div className="mx-4 my-3 border-t" />
            <CardContent className="px-4 pt-0 pb-3">
              <Skeleton className="mb-2 h-3 w-28" />
              <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-10/12" />
              </div>
            </CardContent>
            <div className="mx-4 border-t" />
            <CardContent className="px-4 py-2.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main feed component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 12;

export function PropdatesFeed() {
  const t = useTranslations("propdates");
  const {
    data: feed,
    isLoading,
    error,
  } = useQuery<ProposalWithPropdatesJSON[]>({
    queryKey: ["propdates-feed-enriched"],
    queryFn: () => fetch("/api/propdates/enriched").then((r) => r.json()),
  });

  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const entries = feed ?? [];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (obs) => {
        if (obs[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, entries.length));
        }
      },
      { rootMargin: "200px" },
    );

    const current = sentinelRef.current;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
    };
  }, [entries.length]);

  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(PAGE_SIZE, prev), entries.length || PAGE_SIZE));
  }, [entries.length]);

  if (isLoading) {
    return <EnrichedFeedSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("feed.errorTitle")}</AlertTitle>
        <AlertDescription>{t("feed.errorDesc")}</AlertDescription>
      </Alert>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">{t("feed.noPropdatesYet")}</p>
        <p className="mt-1 text-sm text-muted-foreground/70">{t("feed.noPropdatesDesc")}</p>
      </div>
    );
  }

  const visibleEntries = entries.slice(0, visibleCount);

  return (
    <>
      <div className="space-y-4">
        {visibleEntries.map((entry, i) => (
          <ProposalUpdateCard key={entry.proposal.proposalId} entry={entry} index={i} />
        ))}
      </div>

      {entries.length > visibleCount && (
        <div className="mt-4 space-y-4">
          {Array.from({ length: Math.min(3, entries.length - visibleCount) }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      )}

      {visibleEntries.length < entries.length && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {t("feed.showingOf", { visible: visibleEntries.length, total: entries.length })}
        </div>
      )}

      <div ref={sentinelRef} className="h-10" />
    </>
  );
}
