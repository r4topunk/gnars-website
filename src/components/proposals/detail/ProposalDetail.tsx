"use client";

import { useState } from "react";
import { ProposalMetrics } from "@/components/proposals/ProposalMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VotingControls } from "@/components/common/VotingControls";
import { ProposalHeader } from "@/components/proposals/detail/ProposalHeader";
import { ProposalDescriptionCard } from "@/components/proposals/detail/ProposalDescriptionCard";
import { ProposedTransactionsTable } from "@/components/proposals/detail/ProposedTransactionsTable";
import { ProposalVotesTable } from "@/components/proposals/detail/ProposalVotesTable";
import { PropdatesPlaceholder } from "@/components/proposals/detail/PropdatesPlaceholder";
import { Proposal } from "@/components/proposals/types";

interface ProposalDetailProps {
  proposal: Proposal;
}

export function ProposalDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-12 bg-muted rounded animate-pulse" />
      <div className="h-64 bg-muted rounded animate-pulse" />
      <div className="h-96 bg-muted rounded animate-pulse" />
    </div>
  );
}

export function ProposalDetail({ proposal }: ProposalDetailProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<"FOR" | "AGAINST" | "ABSTAIN" | null>(null);

  const handleVote = (vote: "FOR" | "AGAINST" | "ABSTAIN") => {
    setHasVoted(true);
    setUserVote(vote);
  };

  const endDate = proposal.endDate ? new Date(proposal.endDate) : undefined;

  return (
    <div className="space-y-6">
      <ProposalHeader
        proposalNumber={proposal.proposalNumber}
        title={proposal.title}
        proposer={proposal.proposer}
        state={proposal.state}
        transactionHash={proposal.transactionHash}
      />
      <ProposalMetrics
        forVotes={String(proposal.forVotes)}
        againstVotes={String(proposal.againstVotes)}
        abstainVotes={String(proposal.abstainVotes)}
        quorumVotes={String(proposal.quorumVotes)}
        snapshotBlock={proposal.snapshotBlock}
        endDate={endDate}
      />
      <Card id="voting-section">
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
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="votes">Votes</TabsTrigger>
          <TabsTrigger value="propdates">Propdates</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="space-y-6 mt-6">
          <ProposalDescriptionCard description={proposal.description} />
          <ProposedTransactionsTable
            targets={proposal.targets}
            values={proposal.values}
            signatures={proposal.signatures}
          />
        </TabsContent>
        <TabsContent value="votes" className="mt-6 space-y-6">
          <ProposalVotesTable
            votes={proposal.votes?.map((v) => ({
              voter: v.voter,
              choice: v.choice,
              votes: v.votes,
            }))}
          />
        </TabsContent>
        <TabsContent value="propdates" className="mt-6">
          <PropdatesPlaceholder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
