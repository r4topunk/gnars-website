"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { VotingControls } from "@/components/common/VotingControls";
import { useVotes } from "@/hooks/useVotes";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { Propdates } from "@/components/proposals/detail/Propdates";
import { ProposalDescriptionCard } from "@/components/proposals/detail/ProposalDescriptionCard";
import { ProposalHeader } from "@/components/proposals/detail/ProposalHeader";
import { ProposalVotesTable } from "@/components/proposals/detail/ProposalVotesTable";
import { ProposalTransactionVisualization } from "@/components/proposals/transaction/ProposalTransactionVisualization";
import { ProposalMetrics } from "@/components/proposals/ProposalMetrics";
import { Proposal } from "@/components/proposals/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProposalDetailProps {
  proposal: Proposal;
}

export function ProposalDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="h-10 bg-muted rounded animate-pulse" />
      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-24 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
      </div>
      {/* Voting Card */}
      <div className="h-40 bg-muted rounded animate-pulse" />
      {/* Tabs */}
      <div className="h-10 bg-muted rounded animate-pulse" />
      {/* Description & Transactions */}
      <div className="space-y-4">
        <div className="h-48 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

export function ProposalDetail({ proposal }: ProposalDetailProps) {
  const { address, isConnected } = useAccount();
  const [userVote, setUserVote] = useState<"FOR" | "AGAINST" | "ABSTAIN" | null>(null);

  const initialVote = useMemo(() => {
    if (!address) return null;
    return proposal.votes?.find((vote) => vote.voter?.toLowerCase() === address.toLowerCase())?.choice ?? null;
  }, [address, proposal.votes]);

  const currentVote = userVote ?? initialVote;

  const {
    hasVotingPower,
    votingPower,
    isLoading: votesLoading,
    isDelegating,
    delegatedTo,
  } = useVotes({
    chainId: CHAIN.id,
    collectionAddress: GNARS_ADDRESSES.token,
    governorAddress: GNARS_ADDRESSES.governor,
    signerAddress: address ?? undefined,
  });

  const shouldShowVotingCard = isConnected && hasVotingPower;

  const endDate = proposal.endDate ? new Date(proposal.endDate) : undefined;

  return (
    <div className="space-y-6">
      <ProposalHeader
        proposalNumber={proposal.proposalNumber}
        title={proposal.title}
        proposer={proposal.proposer}
        status={proposal.status}
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
      {shouldShowVotingCard ? (
        <Card id="voting-section">
          <CardHeader>
            <CardTitle>Cast Your Vote</CardTitle>
          </CardHeader>
          <CardContent>
            <VotingControls
              proposalIdHex={proposal.proposalId as `0x${string}`}
              proposalNumber={proposal.proposalNumber}
              status={proposal.status}
              existingUserVote={currentVote}
              onVoteSuccess={(choice) => setUserVote(choice)}
              hasVotingPower={hasVotingPower}
              votingPower={votingPower}
              votesLoading={votesLoading}
              isDelegating={isDelegating}
              delegatedTo={delegatedTo}
            />
          </CardContent>
        </Card>
      ) : null}
      <Tabs defaultValue="details" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-3 min-w-fit">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="votes">Votes</TabsTrigger>
            <TabsTrigger value="propdates">Propdates</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="details" className="space-y-6 mt-6">
          <ProposalDescriptionCard description={proposal.description} />
          <Card>
            <CardHeader>
              <CardTitle>Proposed Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <ProposalTransactionVisualization
                targets={proposal.targets}
                values={proposal.values}
                signatures={proposal.signatures}
                calldatas={proposal.calldatas}
              />
            </CardContent>
          </Card>
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
          <Propdates proposalId={proposal.proposalId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
