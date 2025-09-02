"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, CheckCircle, Clock, Pause, XCircle } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { AddressDisplay } from "@/components/ui/address-display";
import { ProposalCard } from "@/components/proposal-card";
import { Proposal, ProposalStatus } from "@/components/proposals/types";
import { RecentProposalsHeader } from "@/components/recent-proposals/RecentProposalsHeader";
import { ProposalsGrid } from "@/components/recent-proposals/ProposalsGrid";
import { RecentProposalsLoadingSkeleton } from "@/components/recent-proposals/LoadingSkeleton";
import { RecentProposalsEmptyState } from "@/components/recent-proposals/EmptyState";

// Re-export for backwards compatibility
export { ProposalStatus, type Proposal } from "@/components/proposals/types";

interface RecentProposalsProps {
  proposals?: Proposal[];
  limit?: number;
  excludeStatuses?: ProposalStatus[];
}

// Status styling configuration
const getStatusConfig = (status: ProposalStatus) => {
  const configs = {
    [ProposalStatus.ACTIVE]: {
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      icon: Clock,
      description: "Voting in progress",
    },
    [ProposalStatus.PENDING]: {
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      icon: Pause,
      description: "Awaiting voting period",
    },
    [ProposalStatus.SUCCEEDED]: {
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      icon: CheckCircle,
      description: "Passed, ready for execution",
    },
    [ProposalStatus.QUEUED]: {
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      icon: AlertCircle,
      description: "Queued for execution",
    },
    [ProposalStatus.EXECUTED]: {
      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      icon: CheckCircle,
      description: "Successfully executed",
    },
    [ProposalStatus.DEFEATED]: {
      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      icon: XCircle,
      description: "Did not pass",
    },
    [ProposalStatus.CANCELLED]: {
      color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      icon: XCircle,
      description: "Cancelled",
    },
    [ProposalStatus.EXPIRED]: {
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      icon: Clock,
      description: "Expired",
    },
    [ProposalStatus.VETOED]: {
      color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      icon: XCircle,
      description: "Vetoed",
    },
  };
  return configs[status] || configs[ProposalStatus.PENDING];
};

function extractFirstUrl(text?: string): string | null {
  if (!text) return null;
  const httpMatch = text.match(/https?:\/\/[^\s)]+/i);
  if (httpMatch && httpMatch[0]) return httpMatch[0];
  const ipfsMatch = text.match(/ipfs:\/\/[\w./-]+/i);
  if (ipfsMatch && ipfsMatch[0]) return ipfsMatch[0];
  return null;
}

function normalizeImageUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  try {
    if (rawUrl.startsWith("ipfs://")) {
      const hash = rawUrl.replace(/^ipfs:\/\//i, "").replace(/^ipfs\//i, "");
      return `https://ipfs.io/ipfs/${hash}`;
    }
    // Validate URL shape; allow any host (Next config handles domains)
    new URL(rawUrl);
    return rawUrl;
  } catch {
    return null;
  }
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
