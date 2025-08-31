"use client";

import { useEffect, useState } from "react";
import { getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { Proposal, ProposalCard, ProposalStatus } from "@/components/recent-proposals";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";

export function ProposalsGrid() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="h-48 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (proposals.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No proposals found</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {proposals.map((proposal) => (
        <ProposalCard key={proposal.proposalId} proposal={proposal} showBanner />
      ))}
    </div>
  );
}
