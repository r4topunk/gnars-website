"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, User } from "lucide-react";
import { getProposal, getProposals, type Proposal as SdkProposal } from "@buildeross/sdk";
import { ProposalMetrics } from "@/components/proposal-metrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VotingControls } from "@/components/voting-controls";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import ReactMarkdown from "react-markdown";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Pie, PieChart, Cell } from "recharts";

interface UiProposalVote {
  voter: string;
  voterEnsName?: string;
  choice: "FOR" | "AGAINST" | "ABSTAIN";
  votes: string;
  transactionHash: string;
}

interface UiProposal {
  proposalId: string;
  proposalNumber: number;
  title: string;
  description: string;
  state:
    | "PENDING"
    | "ACTIVE"
    | "DEFEATED"
    | "SUCCEEDED"
    | "QUEUED"
    | "EXECUTED"
    | "CANCELED"
    | "VETOED";
  proposer: string;
  proposerEnsName?: string;
  createdAt: number;
  endBlock: number;
  snapshotBlock?: number;
  endDate?: Date;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorumVotes: string;
  calldatas: string[];
  targets: string[];
  values: string[];
  signatures: string[];
  transactionHash: string;
  votes?: UiProposalVote[];
}

interface ProposalDetailProps {
  proposalId: string;
}

const getStatusBadgeVariant = (state: UiProposal["state"]) => {
  switch (state) {
    case "EXECUTED":
      return "default"; // green
    case "ACTIVE":
      return "secondary"; // blue
    case "DEFEATED":
    case "VETOED":
      return "destructive"; // red
    case "CANCELED":
      return "outline"; // gray
    default:
      return "secondary";
  }
};

const getStatusLabel = (state: UiProposal["state"]) => {
  switch (state) {
    case "PENDING":
      return "Pending";
    case "ACTIVE":
      return "Active";
    case "DEFEATED":
      return "Defeated";
    case "SUCCEEDED":
      return "Succeeded";
    case "QUEUED":
      return "Queued";
    case "EXECUTED":
      return "Executed";
    case "CANCELED":
      return "Canceled";
    case "VETOED":
      return "Vetoed";
    default:
      return state;
  }
};

export function ProposalDetail({ proposalId }: ProposalDetailProps) {
  const [proposal, setProposal] = useState<UiProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<"FOR" | "AGAINST" | "ABSTAIN" | null>(null);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        // Resolve whether the route param is a 0x proposalId or a numeric proposalNumber.
        const isHexId = proposalId.startsWith("0x");
        let sdkProposal: SdkProposal | undefined;

        if (isHexId) {
          sdkProposal = await getProposal(CHAIN.id as unknown as number, proposalId);
        } else {
          // Numeric route: search proposals by proposalNumber (paginate up to 5 pages x 200 = 1000)
          const targetNumber = Number.parseInt(proposalId, 10);
          if (Number.isNaN(targetNumber)) {
            sdkProposal = undefined;
          } else {
            const LIMIT = 200;
            const MAX_PAGES = 5;
            for (let page = 0; page < MAX_PAGES; page += 1) {
              const { proposals } = await getProposals(
                CHAIN.id as unknown as number,
                GNARS_ADDRESSES.token,
                LIMIT,
                page,
              );
              const match = (proposals ?? []).find(
                (p) => Number(p.proposalNumber ?? -1) === targetNumber,
              );
              if (match) {
                sdkProposal = match;
                break;
              }
              if (!proposals || proposals.length < LIMIT) {
                break; // no more pages
              }
            }
          }
        }

        if (!sdkProposal) {
          setProposal(null);
          return;
        }

        const endDate = (() => {
          // Prefer executableFrom/expiresAt, else interpret voteEnd as seconds
          const voteEnd = Number(sdkProposal.voteEnd ?? 0);
          if (voteEnd > 0) return new Date(voteEnd * 1000);
          const expiresAt = Number((sdkProposal as any).expiresAt ?? 0);
          return expiresAt > 0 ? new Date(expiresAt * 1000) : undefined;
        })();

        const uiProposal: UiProposal = {
          proposalId: String(sdkProposal.proposalId),
          proposalNumber: Number(sdkProposal.proposalNumber ?? 0),
          title: sdkProposal.title ?? "",
          description: sdkProposal.description ?? "",
          state: String(sdkProposal.state ?? "PENDING").toUpperCase() as UiProposal["state"],
          proposer: String(sdkProposal.proposer),
          proposerEnsName: undefined,
          createdAt: Number(sdkProposal.timeCreated ?? 0) * 1000,
          endBlock: Number(sdkProposal.voteEnd ?? 0),
          snapshotBlock: sdkProposal.snapshotBlockNumber ? Number(sdkProposal.snapshotBlockNumber) : undefined,
          endDate,
          forVotes: String(sdkProposal.forVotes ?? 0),
          againstVotes: String(sdkProposal.againstVotes ?? 0),
          abstainVotes: String(sdkProposal.abstainVotes ?? 0),
          quorumVotes: String(sdkProposal.quorumVotes ?? 0),
          calldatas: Array.isArray(sdkProposal.calldatas)
            ? (sdkProposal.calldatas as string[])
            : typeof (sdkProposal as any).calldatas === "string"
              ? [(sdkProposal as any).calldatas]
              : [],
          targets: (sdkProposal.targets as unknown[] | undefined)?.map(String) ?? [],
          values: (sdkProposal.values as unknown[] | undefined)?.map(String) ?? [],
          signatures: [],
          transactionHash: String(sdkProposal.transactionHash ?? ""),
          votes: Array.isArray(sdkProposal.votes)
            ? sdkProposal.votes.map((v) => ({
                voter: String(v.voter),
                voterEnsName: undefined,
                choice: ((): UiProposalVote["choice"] => {
                  const s = String(v.support ?? "").toUpperCase();
                  if (s.includes("FOR")) return "FOR";
                  if (s.includes("AGAINST")) return "AGAINST";
                  return "ABSTAIN";
                })(),
                votes: String(v.weight ?? 0),
                transactionHash: "",
              }))
            : [],
        };

        setProposal(uiProposal);
      } catch (error) {
        console.error("Failed to fetch proposal:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposal();
  }, [proposalId]);

  const handleVote = (vote: "FOR" | "AGAINST" | "ABSTAIN") => {
    setHasVoted(true);
    setUserVote(vote);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-muted-foreground">Proposal Not Found</h2>
        <p className="text-muted-foreground mt-2">
          The proposal you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button asChild className="mt-4">
          <Link href="/proposals">Back to Proposals</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Proposal #{proposal.proposalNumber}</h1>
          <Badge variant={getStatusBadgeVariant(proposal.state)}>
            {getStatusLabel(proposal.state)}
          </Badge>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a
            href={`https://basescan.org/tx/${proposal.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            View Transaction <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* Title and Proposer */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{proposal.title}</h2>
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" />
          <span>
            By{" "}
            {proposal.proposerEnsName ||
              `${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}`}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <ProposalMetrics
        forVotes={proposal.forVotes}
        againstVotes={proposal.againstVotes}
        abstainVotes={proposal.abstainVotes}
        quorumVotes={proposal.quorumVotes}
        snapshotBlock={proposal.snapshotBlock}
        endDate={proposal.endDate}
      />

      {/* Voting Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Cast Your Vote</CardTitle>
        </CardHeader>
        <CardContent>
          <VotingControls
            proposalId={proposal.proposalNumber.toString()}
            isActive={proposal.state === "ACTIVE"}
            hasVoted={hasVoted}
            userVote={userVote || undefined}
            onVote={handleVote}
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="votes">Votes</TabsTrigger>
          <TabsTrigger value="propdates">Propdates</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <ReactMarkdown>{proposal.description}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Proposer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Proposer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">
                    {proposal.proposerEnsName ||
                      `${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}`}
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">{proposal.proposer}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proposed Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Proposed Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {proposal.targets.map((target, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Target:</span>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{target}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Value:</span>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {parseInt(proposal.values[index]) / 1e18} ETH
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Function:</span>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {proposal.signatures[index] || "N/A"}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="votes" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vote Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const forNum = Number(proposal.forVotes ?? 0);
                const againstNum = Number(proposal.againstVotes ?? 0);
                const abstainNum = Number(proposal.abstainVotes ?? 0);
                const data = [
                  { name: "For", value: forNum, key: "for" },
                  { name: "Against", value: againstNum, key: "against" },
                  { name: "Abstain", value: abstainNum, key: "abstain" },
                ];
                const total = forNum + againstNum + abstainNum;
                const colors: Record<string, string> = {
                  for: "#22c55e",
                  against: "#ef4444",
                  abstain: "#6b7280",
                };
                const config = {
                  for: { label: "For", color: colors.for },
                  against: { label: "Against", color: colors.against },
                  abstain: { label: "Abstain", color: colors.abstain },
                } as const;
                return (
                  <ChartContainer config={config} className="w-full">
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            indicator="dot"
                            formatter={(value, name) => (
                              <div className="flex w-full items-center justify-between gap-4">
                                <span className="text-muted-foreground">{name}</span>
                                <span className="font-mono tabular-nums">
                                  {Number(value).toLocaleString()} (
                                  {total > 0 ? Math.round((Number(value) / total) * 100) : 0}%)
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} strokeWidth={2}>
                        {data.map((entry) => (
                          <Cell key={entry.key} fill={colors[entry.key]} />
                        ))}
                      </Pie>
                      <ChartLegend
                        verticalAlign="bottom"
                        content={<ChartLegendContent nameKey="name" />}
                      />
                    </PieChart>
                  </ChartContainer>
                );
              })()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Individual Votes</CardTitle>
            </CardHeader>
            <CardContent>
              {proposal.votes && proposal.votes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voter</TableHead>
                      <TableHead>Choice</TableHead>
                      <TableHead className="text-right">Vote Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposal.votes.map((vote, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-mono text-sm">
                            {vote.voterEnsName ||
                              `${vote.voter.slice(0, 6)}...${vote.voter.slice(-4)}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              vote.choice === "FOR"
                                ? "default"
                                : vote.choice === "AGAINST"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {vote.choice}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {parseFloat(vote.votes).toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No votes have been cast yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="propdates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Propdates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Propdates functionality coming soon...</p>
                <p className="text-sm mt-2">
                  This will show EAS-based proposal updates and community feedback
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
