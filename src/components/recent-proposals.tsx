"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import {
  CalendarDays,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pause,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// Proposal status enum based on reference analysis
export enum ProposalStatus {
  PENDING = "Pending",
  ACTIVE = "Active",
  SUCCEEDED = "Succeeded",
  QUEUED = "Queued",
  EXECUTED = "Executed",
  DEFEATED = "Defeated",
  CANCELLED = "Cancelled",
  EXPIRED = "Expired",
  VETOED = "Vetoed",
}

// Proposal data structure based on reference analysis
export interface Proposal {
  proposalId: string;
  proposalNumber: number;
  title: string;
  description?: string;
  proposer: string;
  status: ProposalStatus;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorumVotes: number;
  voteStart: string;
  voteEnd: string;
  expiresAt?: string;
  timeCreated: number;
  executed: boolean;
  canceled: boolean;
  queued: boolean;
  vetoed: boolean;
  transactionHash?: string;
}

interface RecentProposalsProps {
  proposals?: Proposal[];
  limit?: number;
  excludeStatuses?: ProposalStatus[];
}

// Status styling configuration
const getStatusConfig = (status: ProposalStatus) => {
  const configs = {
    [ProposalStatus.ACTIVE]: {
      color:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      icon: Clock,
      description: "Voting in progress",
    },
    [ProposalStatus.PENDING]: {
      color:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      icon: Pause,
      description: "Awaiting voting period",
    },
    [ProposalStatus.SUCCEEDED]: {
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      icon: CheckCircle,
      description: "Passed, ready for execution",
    },
    [ProposalStatus.QUEUED]: {
      color:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      icon: AlertCircle,
      description: "Queued for execution",
    },
    [ProposalStatus.EXECUTED]: {
      color:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
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
      color:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
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
    // eslint-disable-next-line no-new
    new URL(rawUrl);
    return rawUrl;
  } catch {
    return null;
  }
}

export function ProposalCard({
  proposal,
  showBanner = false,
}: {
  proposal: Proposal;
  showBanner?: boolean;
}) {
  const statusConfig = getStatusConfig(proposal.status);
  const StatusIcon = statusConfig.icon;

  // Calculate vote percentages
  const totalVotes =
    proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercentage =
    totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const againstPercentage =
    totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;
  const abstainPercentage =
    totalVotes > 0 ? (proposal.abstainVotes / totalVotes) * 100 : 0;

  // Quorum threshold marker position (relative to current votes bar)
  const quorumMarkerPercent =
    proposal.quorumVotes > 0 && totalVotes > 0
      ? Math.min(100, (proposal.quorumVotes / totalVotes) * 100)
      : 100;

  // Time formatting
  const timeCreated = formatDistanceToNow(
    new Date(proposal.timeCreated * 1000),
    { addSuffix: true }
  );
  const voteEndTime = new Date(proposal.voteEnd);
  const isVotingActive =
    proposal.status === ProposalStatus.ACTIVE && voteEndTime > new Date();

  const bannerUrl = normalizeImageUrl(extractFirstUrl(proposal.description));
  const [currentBannerSrc, setCurrentBannerSrc] = useState<string>(
    bannerUrl ?? "/logo-banner.jpg"
  );
  useEffect(() => {
    setCurrentBannerSrc(bannerUrl ?? "/logo-banner.jpg");
  }, [bannerUrl]);

  return (
    <Link href={`/proposals/${proposal.proposalNumber}`} className="block">
      <Card className="hover:shadow-md transition-shadow overflow-hidden cursor-pointer">
        {showBanner && (
          <div className="mx-4 border rounded-md overflow-hidden">
            <AspectRatio ratio={16 / 9}>
              <Image
                src={currentBannerSrc}
                alt="Proposal banner"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
                priority={false}
                onError={() => {
                  if (currentBannerSrc !== "/logo-banner.jpg") {
                    setCurrentBannerSrc("/logo-banner.jpg");
                  }
                }}
              />
            </AspectRatio>
          </div>
        )}
        <CardContent className="px-4 py-2">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    Prop #{proposal.proposalNumber}
                  </span>
                  <div className="flex-shrink-0">
                    <Badge className={`${statusConfig.color} text-xs`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {proposal.status}
                    </Badge>
                  </div>
                </div>
                <h4 className="font-semibold text-sm leading-tight truncate pr-2">
                  {proposal.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  by {proposal.proposer.slice(0, 6)}...
                  {proposal.proposer.slice(-4)} • {timeCreated}
                </p>
              </div>
            </div>

            {/* Voting Progress */}
            {totalVotes > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Voting Progress</span>
                  <span>{totalVotes} votes</span>
                </div>

                {/* Vote breakdown bars with quorum marker */}
                <div className="space-y-1">
                  <div className="relative">
                    <div className="flex gap-0.5">
                      {proposal.forVotes > 0 && (
                        <div
                          className={cn(
                            "h-1.5 bg-green-500",
                            proposal.againstVotes === 0 &&
                              proposal.abstainVotes === 0
                              ? "rounded"
                              : "rounded-l"
                          )}
                          style={{ width: `${forPercentage}%` }}
                        />
                      )}
                      {proposal.againstVotes > 0 && (
                        <div
                          className={cn(
                            "h-1.5 bg-red-500",
                            proposal.forVotes === 0 &&
                              proposal.abstainVotes === 0
                              ? "rounded"
                              : proposal.abstainVotes === 0
                              ? "rounded-r"
                              : ""
                          )}
                          style={{ width: `${againstPercentage}%` }}
                        />
                      )}
                      {proposal.abstainVotes > 0 && (
                        <div
                          className={cn(
                            "h-1.5 bg-gray-300",
                            proposal.forVotes === 0 &&
                              proposal.againstVotes === 0
                              ? "rounded"
                              : "rounded-r"
                          )}
                          style={{ width: `${abstainPercentage}%` }}
                        />
                      )}
                    </div>

                    {proposal.quorumVotes > 0 && totalVotes > 0 && (
                      <div className="pointer-events-none absolute inset-0">
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-yellow-300"
                          style={{
                            left: `${quorumMarkerPercent}%`,
                            transform: "translateX(-50%)",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3 text-green-500" />
                      <span>
                        {proposal.forVotes} ({forPercentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsDown className="w-3 h-3 text-red-500" />
                      <span>
                        {proposal.againstVotes} ({againstPercentage.toFixed(0)}
                        %)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MinusCircle className="w-3 h-3 text-gray-400" />
                      <span>
                        {proposal.abstainVotes} ({abstainPercentage.toFixed(0)}
                        %)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active voting countdown */}
            {isVotingActive && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Voting ends</span>
                <span className="font-medium">
                  {formatDistanceToNow(voteEndTime, { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
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

export function RecentProposals({
  proposals,
  limit = 3,
  excludeStatuses = [],
}: RecentProposalsProps) {
  const [internalProposals, setInternalProposals] = useState<Proposal[]>(
    proposals ?? []
  );
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
          Math.max(10, limit)
        );
        if (!isMounted) return;
        const mapped: Proposal[] = (
          (sdkProposals as SdkProposal[] | undefined) ?? []
        ).map((p) => ({
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
          expiresAt: p.expiresAt
            ? new Date(Number(p.expiresAt) * 1000).toISOString()
            : undefined,
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

  const data = (proposals ?? internalProposals).filter(
    (p) => !excludeStatuses.includes(p.status)
  );
  const displayedProposals = data.slice(0, limit);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            Recent Proposals
          </CardTitle>
          <CardDescription>
            Latest governance proposals and their voting status
          </CardDescription>
        </div>
        <Button variant="outline" size="sm">
          View All Proposals
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="h-48 bg-muted rounded animate-pulse" />
            <div className="h-48 bg-muted rounded animate-pulse" />
            <div className="h-48 bg-muted rounded animate-pulse" />
          </div>
        ) : displayedProposals.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Recent Proposals</h3>
            <p className="text-muted-foreground">
              Check back later for new governance proposals.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayedProposals.map((proposal) => (
                <ProposalCard key={proposal.proposalId} proposal={proposal} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
