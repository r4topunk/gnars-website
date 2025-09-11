"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Proposal, ProposalStatus } from "@/components/proposals/types";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { LoadingGridSkeleton } from "@/components/skeletons/loading-grid-skeleton";

export function ProposalsGridSkeleton() {
  return (
    <LoadingGridSkeleton
      items={12}
      withCard
      aspectClassName="h-24"
      containerClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    />
  );
}

export function ProposalsGrid({
  proposals,
  filterStatuses,
  searchFilteredIds,
}: {
  proposals: Proposal[];
  filterStatuses?: Set<ProposalStatus>;
  searchFilteredIds?: string[] | null;
}) {
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const defaultActiveStatuses = useMemo(
    () => new Set((Object.values(ProposalStatus) as ProposalStatus[]).filter((s) => s !== ProposalStatus.CANCELLED)),
    [],
  );

  // Apply search filter if available, then status filter
  const searchedProposals = useMemo(() => {
    if (searchFilteredIds === null) return []; // Search is active, but no results
    if (searchFilteredIds === undefined) return proposals; // Search not active
    const idsSet = new Set(searchFilteredIds);
    return proposals.filter((p) => idsSet.has(p.proposalId));
  }, [proposals, searchFilteredIds]);

  // Derive filtered proposals based on provided statuses or default
  const effectiveStatuses = filterStatuses ?? defaultActiveStatuses;
  const filteredProposals = useMemo(
    () => searchedProposals.filter((p) => effectiveStatuses.has(p.status)),
    [searchedProposals, effectiveStatuses],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + PAGE_SIZE, filteredProposals.length)
          );
        }
      },
      { rootMargin: "200px" }
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
  }, [filteredProposals.length]);

  // Reset/clamp visible count when data or filters change

  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(PAGE_SIZE, prev), filteredProposals.length || PAGE_SIZE));
  }, [filteredProposals.length, proposals.length]); // Added proposals.length to trigger effect on initial load if proposals are empty

  if (proposals.length === 0) {
    return <LoadingGridSkeleton items={12} withCard aspectClassName="h-24" containerClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3" />;
  }

  if (filteredProposals.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No proposals match the selected filters</div>;
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProposals.slice(0, visibleCount).map((proposal, i) => (
          <div
            key={proposal.proposalId}
            className="motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-1"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <ProposalCard proposal={proposal} showBanner />
          </div>
        ))}
      </div>
      {filteredProposals.length > visibleCount && (
        <div className="mt-4">
          <LoadingGridSkeleton items={6} withCard aspectClassName="h-24" containerClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3" />
        </div>
      )}
      <div ref={sentinelRef} className="h-10" />
    </>
  );
}
