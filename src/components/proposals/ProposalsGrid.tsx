"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedListItem } from "@/components/common/AnimatedListItem";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { Proposal } from "@/components/proposals/types";
import type { MultiChainProposal } from "@/services/multi-chain-proposals";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ProposalCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Banner skeleton */}
      <div className="mx-4 mt-4 rounded-md overflow-hidden">
        <div className="aspect-video relative">
          <Skeleton className="absolute inset-0" />
        </div>
      </div>
      <CardContent className="px-4 py-2">
        <div className="space-y-3">
          {/* Prop # + Status */}
          <div className="flex items-center justify-between gap-2 mt-1">
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
          {/* Title */}
          <Skeleton className="h-4 w-[85%]" />
          {/* Proposer + time */}
          <Skeleton className="h-3 w-2/3" />
          {/* Voting progress */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          {/* Requested */}
          <div className="border-t border-border/60 pt-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProposalsGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-in fade-in-0"
          style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
        >
          <ProposalCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function ProposalsGrid({
  proposals,
  isLoading = false,
}: {
  proposals: (Proposal | MultiChainProposal)[];
  isLoading?: boolean;
}) {
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, proposals.length));
        }
      },
      { rootMargin: "200px" },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [PAGE_SIZE, proposals.length]);

  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(PAGE_SIZE, prev), proposals.length || PAGE_SIZE));
  }, [PAGE_SIZE, proposals.length]);

  if (proposals.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">No proposals match the selected filters</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Try adjusting the chain or status filters
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {proposals.slice(0, visibleCount).map((proposal, i) => (
          <AnimatedListItem key={proposal.proposalId} delayMs={i * 40}>
            <ProposalCard proposal={proposal} showBanner />
          </AnimatedListItem>
        ))}
        {/* Show skeleton cards while loading additional chains */}
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`loading-${i}`}
              className="animate-in fade-in-0"
              style={{
                animationDelay: `${i * 80}ms`,
                animationFillMode: "both",
              }}
            >
              <ProposalCardSkeleton />
            </div>
          ))}
      </div>
      {proposals.length > visibleCount && (
        <div className="mt-4">
          <ProposalsGridSkeleton count={3} />
        </div>
      )}
      <div ref={sentinelRef} className="h-10" />
    </>
  );
}
