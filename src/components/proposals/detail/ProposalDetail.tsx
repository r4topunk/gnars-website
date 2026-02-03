"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { VotingControls } from "@/components/common/VotingControls";
import { Propdates } from "@/components/proposals/detail/Propdates";
import { ProposalActions } from "@/components/proposals/detail/ProposalActions";
import { ProposalDescriptionCard } from "@/components/proposals/detail/ProposalDescriptionCard";
import { ProposalHeader } from "@/components/proposals/detail/ProposalHeader";
import { ProposalVotesList } from "@/components/proposals/detail/ProposalVotesList";
import { ProposalMetrics } from "@/components/proposals/ProposalMetrics";
import { ProposalTransactionVisualization } from "@/components/proposals/transaction/ProposalTransactionVisualization";
import { Proposal, type ProposalVote } from "@/components/proposals/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePropdates } from "@/hooks/use-propdates";
import { useVotes } from "@/hooks/useVotes";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { isProposalSuccessful } from "@/lib/utils/proposal-state";

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
  const { address } = useAccount();
  const [userVote, setUserVote] = useState<"FOR" | "AGAINST" | "ABSTAIN" | null>(null);
  const [userVoteReason, setUserVoteReason] = useState<string | null>(null);
  const [hasRecentVoteConfirmation, setHasRecentVoteConfirmation] = useState(false);
  const [voteTotals, setVoteTotals] = useState({
    forVotes: proposal.forVotes,
    againstVotes: proposal.againstVotes,
    abstainVotes: proposal.abstainVotes,
  });
  const [votesList, setVotesList] = useState<ProposalVote[]>(() =>
    proposal.votes ? [...proposal.votes] : [],
  );

  useEffect(() => {
    setVoteTotals({
      forVotes: proposal.forVotes,
      againstVotes: proposal.againstVotes,
      abstainVotes: proposal.abstainVotes,
    });
    setVotesList(proposal.votes ? [...proposal.votes] : []);
    setUserVote(null);
    setUserVoteReason(null);
    setHasRecentVoteConfirmation(false);
  }, [proposal]);

  const initialVote = useMemo(() => {
    if (!address) return null;
    const vote = votesList.find((entry) => entry.voter?.toLowerCase() === address.toLowerCase());
    if (!vote) return null;
    return {
      choice: vote.choice,
      reason: (vote as { reason?: string | null }).reason ?? null,
    };
  }, [address, votesList]);

  const currentVote = userVote ?? initialVote?.choice ?? null;
  const currentVoteReason = userVoteReason ?? initialVote?.reason ?? null;

  // Handler for proposal actions success (queue/execute)
  const handleActionSuccess = () => {
    // Refresh the page to get updated proposal data
    router.refresh();
  };

  const handleVoteConfirmed = useCallback(
    ({
      choice,
      votes,
      voter,
      txHash,
      reason,
    }: {
      choice: ProposalVote["choice"];
      votes: bigint;
      voter?: string;
      txHash: `0x${string}`;
      reason?: string;
    }) => {
      setUserVote(choice);
      setUserVoteReason(reason ?? null);
      setHasRecentVoteConfirmation(true);

      const increment = Number(votes);
      if (Number.isFinite(increment)) {
        setVoteTotals((prev) => {
          switch (choice) {
            case "FOR":
              return { ...prev, forVotes: prev.forVotes + increment };
            case "AGAINST":
              return { ...prev, againstVotes: prev.againstVotes + increment };
            case "ABSTAIN":
              return { ...prev, abstainVotes: prev.abstainVotes + increment };
            default:
              return prev;
          }
        });
      }

      if (voter) {
        const lowerVoter = voter.toLowerCase();
        setVotesList((prev) => {
          const filtered = prev.filter((vote) => vote.voter.toLowerCase() !== lowerVoter);
          const updated: ProposalVote = {
            voter,
            voterEnsName: undefined,
            choice,
            votes: votes.toString(),
            transactionHash: txHash,
            reason: reason ?? null,
          };
          return [updated, ...filtered];
        });
      }
    },
    [setUserVote, setUserVoteReason, setHasRecentVoteConfirmation, setVoteTotals, setVotesList],
  );

  // Find user's vote from subgraph
  const userVoteFromSubgraph = votesList.find(
    (v) => v.voter?.toLowerCase() === address?.toLowerCase(),
  );

  const { votingPower, isLoading: votesLoading } = useVotes({
    chainId: CHAIN.id,
    collectionAddress: GNARS_ADDRESSES.token,
    governorAddress: GNARS_ADDRESSES.governor,
    signerAddress: address ?? undefined,
    snapshotBlock: proposal.snapshotBlock ? BigInt(proposal.snapshotBlock) : undefined,
    // Use vote weight from subgraph if available (more reliable than getPastVotes)
    voteWeightFromSubgraph: userVoteFromSubgraph?.votes
      ? Number(userVoteFromSubgraph.votes)
      : undefined,
  });

  // Fetch propdates to determine if the tab should be shown
  const { propdates } = usePropdates(proposal.proposalId);

  // Show propdates tab if there's at least one propdate OR the connected user is the proposal owner
  const isProposalOwner =
    address && proposal.proposer
      ? address.toLowerCase() === proposal.proposer.toLowerCase()
      : false;
  const hasPropdates = (propdates?.length ?? 0) > 0;
  const shouldShowPropdatesTab = hasPropdates || isProposalOwner;

  // Show votes tab if there are any votes (for any status: Active, Executed, Defeated, etc.)
  const shouldShowVotesTab = votesList.length > 0;

  // Count visible tabs to determine if we should show tabs at all
  const visibleTabsCount = 1 + (shouldShowVotesTab ? 1 : 0) + (shouldShowPropdatesTab ? 1 : 0);
  const shouldShowTabs = visibleTabsCount > 1;

  // Show voting card for active proposals (connection check moved to VotingControls to avoid hydration issues)
  const isProposalActive = proposal.status === "Active";
  const shouldShowVotingCard = isProposalActive;

  const endDate = proposal.endDate ? new Date(proposal.endDate) : undefined;
  const startDate = proposal.voteStart ? new Date(proposal.voteStart) : undefined;

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
        forVotes={String(voteTotals.forVotes)}
        againstVotes={String(voteTotals.againstVotes)}
        abstainVotes={String(voteTotals.abstainVotes)}
        quorumVotes={String(proposal.quorumVotes)}
        snapshotBlock={proposal.snapshotBlock}
        status={proposal.status}
        startDate={startDate}
        endDate={endDate}
      />
      {shouldShowVotingCard ? (
        <Card id="voting-section">
          <CardHeader>
            <CardTitle suppressHydrationWarning>
              {currentVote ? "Your Vote" : "Cast Your Vote"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VotingControls
              proposalIdHex={proposal.proposalId as `0x${string}`}
              status={proposal.status}
              existingUserVote={currentVote}
              existingUserReason={currentVoteReason}
              showConfirmedButton={hasRecentVoteConfirmation}
              onVoteSuccess={handleVoteConfirmed}
              votingPower={votingPower}
              votesLoading={votesLoading}
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
            <TabsList
              className={`grid w-full ${visibleTabsCount === 2 ? "grid-cols-2" : "grid-cols-3"} min-w-fit`}
            >
              <TabsTrigger value="details">Details</TabsTrigger>
              {shouldShowVotesTab && <TabsTrigger value="votes">Votes</TabsTrigger>}
              {shouldShowPropdatesTab && <TabsTrigger value="propdates">Propdates</TabsTrigger>}
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
                votes={votesList.map((v) => ({
                  voter: v.voter,
                  choice: v.choice,
                  votes: v.votes,
                  reason: (v as { reason?: string | null }).reason ?? null,
                }))}
                proposalId={proposal.proposalId}
                isActive={proposal.status === "Active"}
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
