"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
import { useUserAddress } from "@/hooks/use-user-address";
import { useVotes } from "@/hooks/useVotes";
import { useRouter } from "@/i18n/navigation";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";
import { isProposalSuccessful } from "@/lib/utils/proposal-state";
import type { MultiChainProposal } from "@/services/multi-chain-proposals";

interface ProposalDetailProps {
  proposal: Proposal | MultiChainProposal;
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
  const { address } = useUserAddress();
  const t = useTranslations("proposals");

  // Detect proposal source for conditional rendering
  const proposalSource = (proposal as MultiChainProposal).source || "base";
  const isSnapshot = proposalSource === "snapshot";
  const isEthereum = proposalSource === "ethereum";
  // Snapshot and Ethereum proposals are read-only (no voting)
  const isReadOnly = isSnapshot || isEthereum;

  // Mount flag keeps the initial client render identical to the SSR tree.
  // `address` (thirdweb, synchronous from storage) and `propdates` (async)
  // are undefined on the server, so we must treat them as undefined during
  // the first hydration pass too, then let post-mount updates reveal tabs.
  // The <Tabs> shell is always rendered, so this only affects which
  // <TabsTrigger>s appear — no structural mismatch either way.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
    const normalizedAddr = String(address ?? "").toLowerCase();
    const vote = votesList.find(
      (entry) => String(entry.voter ?? "").toLowerCase() === normalizedAddr,
    );
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
        const lowerVoter = String(voter ?? "").toLowerCase();
        setVotesList((prev) => {
          const filtered = prev.filter(
            (vote) => String(vote.voter ?? "").toLowerCase() !== lowerVoter,
          );
          const updated: ProposalVote = {
            voter: String(voter),
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

  const {
    votingPower,
    isLoading: votesLoading,
    isDelegating,
    delegatedTo,
  } = useVotes({
    chainId: CHAIN.id,
    collectionAddress: DAO_ADDRESSES.token,
    governorAddress: DAO_ADDRESSES.governor,
    signerAddress: address ?? undefined,
    proposalId: proposal.proposalId as `0x${string}`,
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
    mounted && address && proposal.proposer
      ? address.toLowerCase() === proposal.proposer.toLowerCase()
      : false;
  const hasPropdates = mounted && (propdates?.length ?? 0) > 0;
  const shouldShowPropdatesTab = hasPropdates || isProposalOwner;

  // Show votes tab if there are any votes (for any status: Active, Executed, Defeated, etc.)
  const shouldShowVotesTab = votesList.length > 0;

  // Show transactions tab only if proposal has transaction data
  // Snapshot proposals don't have calldatas/targets/values
  const hasTransactionData =
    proposal.calldatas &&
    proposal.calldatas.length > 0 &&
    proposal.targets &&
    proposal.targets.length > 0;

  // Count visible tabs to decide whether to render the TabsList.
  // The <Tabs> shell itself is always rendered so the SSR tree is stable
  // and does not depend on client-only state (address, fetched propdates).
  const visibleTabsCount = 1 + (shouldShowVotesTab ? 1 : 0) + (shouldShowPropdatesTab ? 1 : 0);
  const shouldShowTabsList = visibleTabsCount > 1;

  // Show voting card for active proposals (connection check moved to VotingControls to avoid hydration issues)
  // Hide voting for read-only proposals (Snapshot and Ethereum)
  const isProposalActive = proposal.status === "Active";
  const shouldShowVotingCard = isProposalActive && !isReadOnly;

  // endDate from SDK, fallback to voteEnd ISO string (needed for ETH/Snapshot proposals)
  const endDate = proposal.endDate
    ? new Date(proposal.endDate)
    : proposal.voteEnd
      ? new Date(proposal.voteEnd)
      : undefined;
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
      {isReadOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-muted bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {isSnapshot ? t("detail.readOnly.snapshot") : t("detail.readOnly.ethereum")}
          </span>
          <span className="text-muted-foreground/40">|</span>
          {t("detail.historicalProposal")}
        </div>
      )}
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
              {currentVote ? t("detail.yourVote") : t("detail.castYourVote")}
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
              isDelegating={isDelegating}
              delegatedTo={delegatedTo}
            />
          </CardContent>
        </Card>
      ) : null}
      {isProposalSuccessful(proposal.status) && (
        <ProposalActions proposal={proposal} onActionSuccess={handleActionSuccess} />
      )}
      <Tabs defaultValue="details" className="w-full">
        {shouldShowTabsList && (
          <div className="overflow-x-auto">
            <TabsList
              className={`grid w-full ${visibleTabsCount === 2 ? "grid-cols-2" : "grid-cols-3"} min-w-fit`}
            >
              <TabsTrigger value="details">{t("detail.details")}</TabsTrigger>
              {shouldShowVotesTab && <TabsTrigger value="votes">{t("detail.votes")}</TabsTrigger>}
              {shouldShowPropdatesTab && (
                <TabsTrigger value="propdates">{t("detail.propdatesTab")}</TabsTrigger>
              )}
            </TabsList>
          </div>
        )}
        <TabsContent value="details" className={`space-y-6 ${shouldShowTabsList ? "mt-6" : ""}`}>
          <ProposalDescriptionCard description={proposal.description} />
          {hasTransactionData && (
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.proposedTransactions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ProposalTransactionVisualization
                  targets={proposal.targets}
                  values={proposal.values}
                  signatures={proposal.signatures}
                  calldatas={proposal.calldatas}
                  descriptions={(proposal as MultiChainProposal).txDescriptions}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        {shouldShowVotesTab && (
          <TabsContent value="votes" className="mt-6 space-y-6">
            <ProposalVotesList
              votes={votesList.map((v) => ({
                voter: v.voter,
                choice: v.choice,
                votes: v.votes,
                reason: (v as { reason?: string | null }).reason ?? null,
                timestamp: (v as { timestamp?: number }).timestamp,
              }))}
              proposalId={proposal.proposalId}
              isActive={proposal.status === "Active"}
            />
          </TabsContent>
        )}
        {shouldShowPropdatesTab && (
          <TabsContent value="propdates" className="mt-6">
            <Propdates
              proposalId={proposal.proposalId}
              proposer={proposal.proposer}
              targets={proposal.targets}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
