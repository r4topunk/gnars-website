"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  showLoadMore?: boolean;
  onLoadMore?: () => void;
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

function ProposalCard({ proposal }: { proposal: Proposal }) {
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

  // Calculate quorum progress
  const quorumProgress =
    proposal.quorumVotes > 0
      ? Math.min(100, (totalVotes / proposal.quorumVotes) * 100)
      : 0;

  // Time formatting
  const timeCreated = formatDistanceToNow(
    new Date(proposal.timeCreated * 1000),
    { addSuffix: true }
  );
  const voteEndTime = new Date(proposal.voteEnd);
  const isVotingActive =
    proposal.status === ProposalStatus.ACTIVE && voteEndTime > new Date();

  return (
    <Card className="hover:shadow-md transition-shadow">
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

              {/* Vote breakdown bars */}
              <div className="space-y-1">
                <div className="flex gap-1">
                  <div
                    className="h-1.5 bg-green-500 rounded-l"
                    style={{ width: `${forPercentage}%` }}
                  />
                  <div
                    className="h-1.5 bg-red-500"
                    style={{ width: `${againstPercentage}%` }}
                  />
                  <div
                    className="h-1.5 bg-gray-300 rounded-r"
                    style={{ width: `${abstainPercentage}%` }}
                  />
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
                      {proposal.againstVotes} ({againstPercentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MinusCircle className="w-3 h-3 text-gray-400" />
                    <span>
                      {proposal.abstainVotes} ({abstainPercentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Quorum progress */}
              {proposal.quorumVotes > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Quorum</span>
                    <span>{quorumProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={quorumProgress} className="h-1" />
                </div>
              )}
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
  );
}

// Mock data based on reference analysis
const mockProposals: Proposal[] = [
  {
    proposalId: "1",
    proposalNumber: 45,
    title: "Fund Gnars BMX Competition Series - Q1 2024",
    proposer: "0x742d35Cc6634C0532925a3b8D52E02c0a65A40f2",
    status: ProposalStatus.ACTIVE,
    forVotes: 125,
    againstVotes: 23,
    abstainVotes: 8,
    quorumVotes: 100,
    voteStart: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    voteEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    timeCreated: Date.now() / 1000 - 3 * 24 * 60 * 60,
    executed: false,
    canceled: false,
    queued: false,
    vetoed: false,
  },
  {
    proposalId: "2",
    proposalNumber: 44,
    title: "Update Treasury Management Strategy for Base Ecosystem",
    proposer: "0x123d35Cc6634C0532925a3b8D52E02c0a65A40f2",
    status: ProposalStatus.SUCCEEDED,
    forVotes: 198,
    againstVotes: 45,
    abstainVotes: 12,
    quorumVotes: 150,
    voteStart: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    voteEnd: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    timeCreated: Date.now() / 1000 - 12 * 24 * 60 * 60,
    executed: false,
    canceled: false,
    queued: true,
    vetoed: false,
  },
  {
    proposalId: "3",
    proposalNumber: 43,
    title: "Partner with Action Sports Brands for NFT Collaborations",
    proposer: "0x456d35Cc6634C0532925a3b8D52E02c0a65A40f2",
    status: ProposalStatus.EXECUTED,
    forVotes: 245,
    againstVotes: 31,
    abstainVotes: 18,
    quorumVotes: 180,
    voteStart: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    voteEnd: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    timeCreated: Date.now() / 1000 - 22 * 24 * 60 * 60,
    executed: true,
    canceled: false,
    queued: false,
    vetoed: false,
  },
  {
    proposalId: "4",
    proposalNumber: 42,
    title: "Establish Gnars Skateboarding Academy Program",
    proposer: "0x789d35Cc6634C0532925a3b8D52E02c0a65A40f2",
    status: ProposalStatus.DEFEATED,
    forVotes: 89,
    againstVotes: 156,
    abstainVotes: 24,
    quorumVotes: 150,
    voteStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    voteEnd: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
    timeCreated: Date.now() / 1000 - 32 * 24 * 60 * 60,
    executed: false,
    canceled: false,
    queued: false,
    vetoed: false,
  },
  {
    proposalId: "5",
    proposalNumber: 41,
    title: "Allocate 50 ETH for Surfing Event Sponsorship",
    proposer: "0xabcd35Cc6634C0532925a3b8D52E02c0a65A40f2",
    status: ProposalStatus.PENDING,
    forVotes: 0,
    againstVotes: 0,
    abstainVotes: 0,
    quorumVotes: 120,
    voteStart: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    voteEnd: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    timeCreated: Date.now() / 1000 - 1 * 24 * 60 * 60,
    executed: false,
    canceled: false,
    queued: false,
    vetoed: false,
  },
  {
    proposalId: "6",
    proposalNumber: 40,
    title: "Create Gnars Merchandise Store with Community Designs",
    proposer: "0xefgh35Cc6634C0532925a3b8D52E02c0a65A40f2",
    status: ProposalStatus.QUEUED,
    forVotes: 167,
    againstVotes: 78,
    abstainVotes: 15,
    quorumVotes: 140,
    voteStart: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    voteEnd: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000).toISOString(),
    timeCreated: Date.now() / 1000 - 42 * 24 * 60 * 60,
    executed: false,
    canceled: false,
    queued: true,
    vetoed: false,
  },
];

export function RecentProposals({
  proposals = mockProposals,
  limit = 3,
  showLoadMore = true,
  onLoadMore,
}: RecentProposalsProps) {
  const displayedProposals = proposals.slice(0, limit);
  const hasMore = proposals.length > limit;

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
        {displayedProposals.length === 0 ? (
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

            {showLoadMore && hasMore && (
              <>
                <Separator className="my-4" />
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={onLoadMore}
                    className="w-full md:w-auto"
                  >
                    Load More Proposals
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
