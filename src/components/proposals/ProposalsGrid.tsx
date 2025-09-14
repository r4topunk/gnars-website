"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatedListItem } from "@/components/common/AnimatedListItem";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { Proposal } from "@/components/proposals/types";
import { LoadingGridSkeleton } from "@/components/skeletons/loading-grid-skeleton";

export function ProposalsGridSkeleton() {
  return (
    <LoadingGridSkeleton
      items={12}
      withCard
      aspectClassName="aspect-video"
      containerClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    />
  );
}

export function ProposalsGrid({ proposals }: { proposals: Proposal[] }) {
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
  }, [proposals.length]);

  // Reset/clamp visible count when data or filters change

  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(PAGE_SIZE, prev), proposals.length || PAGE_SIZE));
  }, [proposals.length]);

  if (proposals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No proposals match the selected filters
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
      </div>
      {proposals.length > visibleCount && (
        <div className="mt-4">
          <LoadingGridSkeleton
            items={6}
            withCard
            aspectClassName="h-24"
            containerClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          />
        </div>
      )}
      <div ref={sentinelRef} className="h-10" />
    </>
  );
}
