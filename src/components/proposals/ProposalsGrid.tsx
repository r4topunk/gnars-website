"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { Proposal, ProposalStatus } from "@/components/proposals/types";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { LoadingGridSkeleton } from "@/components/skeletons/loading-grid-skeleton";

export function ProposalsGrid({
  filterStatuses,
  onAvailableStatusesChange,
}: {
  filterStatuses?: Set<ProposalStatus>;
  onAvailableStatusesChange?: (statuses: Set<ProposalStatus>) => void;
}) {
  const PAGE_SIZE = 12;
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const defaultActiveStatuses = useMemo(
    () => new Set((Object.values(ProposalStatus) as ProposalStatus[]).filter((s) => s !== ProposalStatus.CANCELLED)),
    [],
  );

  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      try {
        setIsLoading(true);
        const { proposals: sdkProposals } = await getProposals(
          CHAIN.id,
          GNARS_ADDRESSES.token,
          200,
        );
        if (!isMounted) return;
        const mapped: Proposal[] = ((sdkProposals as SdkProposal[] | undefined) ?? []).map((p) => ({
          proposalId: String(p.proposalId),
          proposalNumber: Number(p.proposalNumber),
          title: p.title ?? "",
          description: p.description ?? "",
          proposer: p.proposer,
          status: (() => {
            const s = p.state as unknown;
            if (typeof s === "number") {
              switch (s) {
                case 0:
                  return ProposalStatus.PENDING;
                case 1:
                  return ProposalStatus.ACTIVE;
                case 2:
                  return ProposalStatus.CANCELLED;
                case 3:
                  return ProposalStatus.DEFEATED;
                case 4:
                  return ProposalStatus.SUCCEEDED;
                case 5:
                  return ProposalStatus.QUEUED;
                case 6:
                  return ProposalStatus.EXPIRED;
                case 7:
                  return ProposalStatus.EXECUTED;
                case 8:
                  return ProposalStatus.VETOED;
                default:
                  return ProposalStatus.PENDING;
              }
            }
            const up = String(s).toUpperCase();
            switch (up) {
              case "PENDING":
                return ProposalStatus.PENDING;
              case "ACTIVE":
                return ProposalStatus.ACTIVE;
              case "SUCCEEDED":
                return ProposalStatus.SUCCEEDED;
              case "QUEUED":
                return ProposalStatus.QUEUED;
              case "EXECUTED":
                return ProposalStatus.EXECUTED;
              case "DEFEATED":
                return ProposalStatus.DEFEATED;
              case "CANCELED":
                return ProposalStatus.CANCELLED;
              case "VETOED":
                return ProposalStatus.VETOED;
              case "EXPIRED":
                return ProposalStatus.EXPIRED;
              default:
                return ProposalStatus.PENDING;
            }
          })(),
          forVotes: Number(p.forVotes ?? 0),
          againstVotes: Number(p.againstVotes ?? 0),
          abstainVotes: Number(p.abstainVotes ?? 0),
          quorumVotes: Number(p.quorumVotes ?? 0),
          voteStart: new Date(Number(p.voteStart ?? 0) * 1000).toISOString(),
          voteEnd: new Date(Number(p.voteEnd ?? 0) * 1000).toISOString(),
          expiresAt: p.expiresAt ? new Date(Number(p.expiresAt) * 1000).toISOString() : undefined,
          timeCreated: Number(p.timeCreated ?? 0),
          executed: Boolean(p.executedAt),
          canceled: Boolean(p.cancelTransactionHash),
          queued: String(p.state) === "QUEUED",
          vetoed: Boolean(p.vetoTransactionHash),
          transactionHash: p.transactionHash,
        }));
        setProposals(mapped);
        // Inform parent about available statuses immediately after fetch
        onAvailableStatusesChange?.(new Set(mapped.map((p) => p.status)));
      } catch (err) {
        console.error("Failed to load proposals:", err);
        setProposals([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchAll();
    return () => {
      isMounted = false;
    };
  }, [onAvailableStatusesChange]);

  // Derive filtered proposals based on provided statuses or default
  const effectiveStatuses = filterStatuses ?? defaultActiveStatuses;
  const filteredProposals = useMemo(
    () => proposals.filter((p) => effectiveStatuses.has(p.status)),
    [proposals, effectiveStatuses],
  );

  // Reset/clamp visible count when data or filters change
  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(PAGE_SIZE, prev), filteredProposals.length || PAGE_SIZE));
  }, [filteredProposals.length]);

  // Keep parent informed if proposals list changes outside initial fetch
  useEffect(() => {
    if (proposals.length > 0) {
      onAvailableStatusesChange?.(new Set(proposals.map((p) => p.status)));
    }
  }, [proposals, onAvailableStatusesChange]);

  // Observe sentinel to increase visible items progressively
  useEffect(() => {
    if (isLoading || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredProposals.length));
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => {
      observer.unobserve(el);
      observer.disconnect();
    };
  }, [isLoading, filteredProposals.length]);

  if (isLoading && proposals.length === 0) {
    return <LoadingGridSkeleton items={12} withCard aspectClassName="h-24" containerClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3" />;
  }

  if (!isLoading && proposals.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No proposals found</div>;
  }

  if (!isLoading && filteredProposals.length === 0) {
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
      {isLoading && filteredProposals.length > 0 && (
        <div className="mt-4">
          <LoadingGridSkeleton items={6} withCard aspectClassName="h-24" containerClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3" />
        </div>
      )}
      <div ref={sentinelRef} className="h-10" />
    </>
  );
}
