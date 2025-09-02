"use client";

import { useEffect, useState } from "react";
import { getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { Card, CardContent } from "@/components/ui/card";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { Proposal, ProposalStatus } from "@/components/proposals/types";
import { RecentProposalsHeader } from "@/components/proposals/recent/RecentProposalsHeader";
import { ProposalsGrid } from "@/components/proposals/recent/ProposalsGrid";
import { RecentProposalsLoadingSkeleton } from "@/components/proposals/recent/LoadingSkeleton";
import { RecentProposalsEmptyState } from "@/components/proposals/recent/EmptyState";

// Re-export for backwards compatibility
export { ProposalStatus, type Proposal } from "@/components/proposals/types";

interface RecentProposalsProps {
  proposals?: Proposal[];
  limit?: number;
  excludeStatuses?: ProposalStatus[];
}



export function RecentProposals({
  proposals,
  limit = 3,
  excludeStatuses = [],
}: RecentProposalsProps) {
  const [internalProposals, setInternalProposals] = useState<Proposal[]>(proposals ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(!proposals);

  useEffect(() => {
    let isMounted = true;
    const fetchProposals = async () => {
      if (proposals) return; // controlled externally
      try {
        setIsLoading(true);
        const { proposals: sdkProposals } = await getProposals(
          CHAIN.id,
          GNARS_ADDRESSES.token,
          Math.max(10, limit),
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
            return mapSdkStateToStatus(String(s));
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
        setInternalProposals(mapped);
      } catch (err) {
        console.error("Failed to load proposals:", err);
        if (!isMounted) return;
        setInternalProposals(fallbackProposals);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchProposals();
    return () => {
      isMounted = false;
    };
  }, [proposals, limit]);

  const data = (proposals ?? internalProposals).filter((p) => !excludeStatuses.includes(p.status));
  const displayedProposals = data.slice(0, limit);

  return (
    <Card className="w-full">
      <RecentProposalsHeader />
      <CardContent className="space-y-4">
        {isLoading ? (
          <RecentProposalsLoadingSkeleton />
        ) : displayedProposals.length === 0 ? (
          <RecentProposalsEmptyState />
        ) : (
          <ProposalsGrid proposals={displayedProposals} />
        )}
      </CardContent>
    </Card>
  );
}

// Minimal fallback for dev when network fails
const fallbackProposals: Proposal[] = [];

function mapSdkStateToStatus(state: string): ProposalStatus {
  const mapping: Record<string, ProposalStatus> = {
    PENDING: ProposalStatus.PENDING,
    ACTIVE: ProposalStatus.ACTIVE,
    SUCCEEDED: ProposalStatus.SUCCEEDED,
    QUEUED: ProposalStatus.QUEUED,
    EXECUTED: ProposalStatus.EXECUTED,
    DEFEATED: ProposalStatus.DEFEATED,
    CANCELED: ProposalStatus.CANCELLED,
    VETOED: ProposalStatus.VETOED,
    EXPIRED: ProposalStatus.EXPIRED,
  };
  return mapping[state] ?? ProposalStatus.PENDING;
}
