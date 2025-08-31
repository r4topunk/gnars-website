"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, User } from "lucide-react";
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

// Mock proposal data structure
interface Proposal {
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
  votes?: Array<{
    voter: string;
    voterEnsName?: string;
    choice: "FOR" | "AGAINST" | "ABSTAIN";
    votes: string;
    transactionHash: string;
  }>;
}

interface ProposalDetailProps {
  proposalId: string;
}

const getStatusBadgeVariant = (state: Proposal["state"]) => {
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

const getStatusLabel = (state: Proposal["state"]) => {
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
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<"FOR" | "AGAINST" | "ABSTAIN" | null>(null);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        // Mock data - in real implementation use Builder SDK
        // const data = await getProposal(CHAIN.id, proposalId)

        const mockProposal: Proposal = {
          proposalId: proposalId,
          proposalNumber: parseInt(proposalId),
          title: "Fund Gnars Skateboarding Event Series",
          description: `# Gnars Skateboarding Event Series

This proposal seeks funding to organize a series of skateboarding events across major cities to promote the Gnars brand and grow the community.

## Background

The Gnars DAO has been steadily building a community of action sports enthusiasts. To further expand our reach and provide value to our community, we propose organizing a series of skateboarding events.

## Proposal Details

### Events Planned
- **Los Angeles**: Venice Beach Skate Park - March 15, 2024
- **New York**: Brooklyn Bridge Park - April 12, 2024  
- **San Francisco**: Dolores Park - May 10, 2024

### Budget Breakdown
- Venue rentals: 15 ETH
- Equipment and setup: 8 ETH
- Prizes and giveaways: 12 ETH
- Marketing and promotion: 5 ETH
- **Total**: 40 ETH

### Expected Outcomes
- Increased brand awareness in key markets
- Growth of active community members
- Content creation opportunities
- Potential partnerships with local skate shops

We believe these events will significantly boost the Gnars community and create lasting value for all DAO members.`,
          state: "ACTIVE",
          proposer: "0x1234567890abcdef1234567890abcdef12345678",
          proposerEnsName: "gnars-builder.eth",
          createdAt: Date.now() - 86400000 * 2,
          endBlock: 123456999,
          snapshotBlock: 123456500,
          endDate: new Date(Date.now() + 86400000 * 5),
          forVotes: "25.7",
          againstVotes: "3.2",
          abstainVotes: "1.1",
          quorumVotes: "15.0",
          calldatas: ["0x123..."],
          targets: ["0x456..."],
          values: ["40000000000000000000"],
          signatures: ["transfer(address,uint256)"],
          transactionHash: "0xabc123...",
          votes: [
            {
              voter: "0x1111111111111111111111111111111111111111",
              voterEnsName: "skater1.eth",
              choice: "FOR",
              votes: "5.2",
              transactionHash: "0xdef456...",
            },
            {
              voter: "0x2222222222222222222222222222222222222222",
              voterEnsName: "gnars-fan.eth",
              choice: "FOR",
              votes: "8.1",
              transactionHash: "0xghi789...",
            },
            {
              voter: "0x3333333333333333333333333333333333333333",
              choice: "AGAINST",
              votes: "2.3",
              transactionHash: "0xjkl012...",
            },
          ],
        };

        setProposal(mockProposal);
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
                {proposal.description.split("\n").map((paragraph, index) => {
                  if (paragraph.startsWith("# ")) {
                    return (
                      <h1 key={index} className="text-2xl font-bold mt-6 mb-4">
                        {paragraph.slice(2)}
                      </h1>
                    );
                  } else if (paragraph.startsWith("## ")) {
                    return (
                      <h2 key={index} className="text-xl font-semibold mt-5 mb-3">
                        {paragraph.slice(3)}
                      </h2>
                    );
                  } else if (paragraph.startsWith("### ")) {
                    return (
                      <h3 key={index} className="text-lg font-medium mt-4 mb-2">
                        {paragraph.slice(4)}
                      </h3>
                    );
                  } else if (paragraph.startsWith("- ")) {
                    return (
                      <li key={index} className="ml-4">
                        {paragraph.slice(2)}
                      </li>
                    );
                  } else if (paragraph.trim() === "") {
                    return <br key={index} />;
                  } else {
                    return (
                      <p key={index} className="mb-3">
                        {paragraph}
                      </p>
                    );
                  }
                })}
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

        <TabsContent value="votes" className="mt-6">
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
