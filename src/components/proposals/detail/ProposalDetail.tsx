"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { VotingControls } from "@/components/common/VotingControls";
import { useVotes } from "@/hooks/useVotes";
import { usePropdates } from "@/hooks/use-propdates";
import { CHAIN, GNARS_ADDRESSES, IS_DEV } from "@/lib/config";
import { Propdates } from "@/components/proposals/detail/Propdates";
import { ProposalDescriptionCard } from "@/components/proposals/detail/ProposalDescriptionCard";
import { ProposalHeader } from "@/components/proposals/detail/ProposalHeader";
import { ProposalVotesList } from "@/components/proposals/detail/ProposalVotesList";
import { ProposalTransactionVisualization } from "@/components/proposals/transaction/ProposalTransactionVisualization";
import { ProposalMetrics } from "@/components/proposals/ProposalMetrics";
import { ProposalActions } from "@/components/proposals/detail/ProposalActions";
import { Proposal } from "@/components/proposals/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isProposalSuccessful } from "@/lib/utils/proposal-state";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [userVote, setUserVote] = useState<"FOR" | "AGAINST" | "ABSTAIN" | null>(null);

  const initialVote = useMemo(() => {
    if (!address) return null;
    return proposal.votes?.find((vote) => vote.voter?.toLowerCase() === address.toLowerCase())?.choice ?? null;
  }, [address, proposal.votes]);

  const currentVote = userVote ?? initialVote;

  // Handler for proposal actions success (queue/execute)
  const handleActionSuccess = () => {
    // Refresh the page to get updated proposal data
    router.refresh();
  };

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

  // Fetch propdates to determine if the tab should be shown
  const { propdates } = usePropdates(proposal.proposalId);

  // Show propdates tab if there's at least one propdate OR the connected user is the proposal owner
  const isProposalOwner = address && proposal.proposer 
    ? address.toLowerCase() === proposal.proposer.toLowerCase()
    : false;
  const hasPropdates = (propdates?.length ?? 0) > 0;
  const shouldShowPropdatesTab = hasPropdates || isProposalOwner;

  // Show votes tab only if the proposal is active
  const shouldShowVotesTab = proposal.status === "Active";

  // Count visible tabs to determine if we should show tabs at all
  const visibleTabsCount = 1 + (shouldShowVotesTab ? 1 : 0) + (shouldShowPropdatesTab ? 1 : 0);
  const shouldShowTabs = visibleTabsCount > 1;

  // Show voting card only if proposal is active AND (user is connected and has voting power, or in dev mode)
  const isProposalActive = proposal.status === "Active";
  const shouldShowVotingCard = isProposalActive && (IS_DEV || (isConnected && hasVotingPower));

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
      {isProposalSuccessful(proposal.status) && (
        <ProposalActions proposal={proposal} onActionSuccess={handleActionSuccess} />
      )}
      {shouldShowTabs ? (
        <Tabs defaultValue="details" className="w-full">
          <div className="overflow-x-auto">
            <TabsList className={`grid w-full ${visibleTabsCount === 2 ? 'grid-cols-2' : 'grid-cols-3'} min-w-fit`}>
              <TabsTrigger value="details">Details</TabsTrigger>
              {shouldShowVotesTab && (
                <TabsTrigger value="votes">Votes</TabsTrigger>
              )}
              {shouldShowPropdatesTab && (
                <TabsTrigger value="propdates">Propdates</TabsTrigger>
              )}
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
          {shouldShowVotesTab && (
            <TabsContent value="votes" className="mt-6 space-y-6">
              <ProposalVotesList
                votes={proposal.votes?.map((v) => ({
                  voter: v.voter,
                  choice: v.choice,
                  votes: v.votes,
                  reason: (v as { reason?: string | null }).reason ?? null,
                }))}
              />
            </TabsContent>
          )}
          {shouldShowPropdatesTab && (
            <TabsContent value="propdates" className="mt-6">
              <Propdates proposalId={proposal.proposalId} />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <div className="space-y-6">
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
        </div>
      )}
    </div>
  );
}
