"use client";

import { useEffect, useState } from "react";
import { getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { RecentProposalsEmptyState } from "@/components/proposals/recent/EmptyState";
import { RecentProposalsLoadingSkeleton } from "@/components/proposals/recent/LoadingSkeleton";
import { ProposalsGrid } from "@/components/proposals/recent/ProposalsGrid";
import { RecentProposalsHeader } from "@/components/proposals/recent/RecentProposalsHeader";
import { Proposal } from "@/components/proposals/types";
import { Card, CardContent } from "@/components/ui/card";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { getProposalStatus, ProposalStatus } from "@/lib/schemas/proposals";

// Re-export for backwards compatibility
export { type Proposal } from "@/components/proposals/types";
export { ProposalStatus } from "@/lib/schemas/proposals";

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
        const mapped: Proposal[] = ((sdkProposals as SdkProposal[] | undefined) ?? []).map((p) => {
          return {
            proposalId: String(p.proposalId),
            proposalNumber: Number(p.proposalNumber),
            title: p.title ?? "",
            description: p.description ?? "",
            proposer: p.proposer,
            status: getProposalStatus(p.state), // Use the imported getProposalStatus
            proposerEnsName: undefined,
            createdAt: Number(p.timeCreated ?? 0) * 1000,
            endBlock: Number(p.voteEnd ?? 0),
            snapshotBlock: p.snapshotBlockNumber ? Number(p.snapshotBlockNumber) : undefined,
            endDate: p.voteEnd ? new Date(Number(p.voteEnd) * 1000) : undefined,
            forVotes: Number(p.forVotes ?? 0),
            againstVotes: Number(p.againstVotes ?? 0),
            abstainVotes: Number(p.abstainVotes ?? 0),
            quorumVotes: Number(p.quorumVotes ?? 0),
            calldatas: (p.calldatas as string[] | undefined) ?? [],
            targets: (p.targets as string[] | undefined) ?? [],
            values: (p.values as string[] | undefined) ?? [],
            signatures: [], // Initialize as an empty array to satisfy the Proposal interface
            transactionHash: p.transactionHash ?? "",
            votes: [],
            voteStart: new Date(Number(p.voteStart ?? 0) * 1000).toISOString(),
            voteEnd: new Date(Number(p.voteEnd ?? 0) * 1000).toISOString(),
            expiresAt: p.expiresAt ? new Date(Number(p.expiresAt) * 1000).toISOString() : undefined,
            timeCreated: Number(p.timeCreated ?? 0),
          };
        });
        setInternalProposals(mapped);
      } catch (err) {
        console.error("Failed to load proposals:", err);
        if (!isMounted) return;
        setInternalProposals([]); // Set to empty array on error
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
          <RecentProposalsLoadingSkeleton items={limit} />
        ) : displayedProposals.length === 0 ? (
          <RecentProposalsEmptyState />
        ) : (
          <ProposalsGrid proposals={displayedProposals} />
        )}
      </CardContent>
    </Card>
  );
}
