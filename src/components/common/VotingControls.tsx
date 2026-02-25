"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CircleDashed,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  Users,
} from "lucide-react";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { AddressDisplay } from "@/components/ui/address-display";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useCastVote } from "@/hooks/useCastVote";
import { ProposalStatus } from "@/lib/schemas/proposals";
import { fetchDelegatorsWithCounts, type DelegatorWithCount } from "@/services/members";
import { cn } from "@/lib/utils";

type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

export interface VotingControlsProps {
  proposalIdHex: `0x${string}`;
  status: ProposalStatus;
  existingUserVote?: VoteChoice | null;
  existingUserReason?: string | null;
  showConfirmedButton?: boolean;
  onVoteSuccess?: (params: {
    choice: VoteChoice;
    txHash: `0x${string}`;
    votes: bigint;
    voter?: Address;
    reason?: string;
  }) => void;
  votingPower: bigint;
  votesLoading: boolean;
  isDelegating?: boolean;
  delegatedTo?: Address;
}

interface VotingPowerNoticeProps {
  isConnected: boolean;
  votesLoading: boolean;
  votingPower: bigint;
  delegatedToAnother: boolean;
  delegatedTo?: Address;
  delegators: DelegatorWithCount[];
  delegatorsLoading: boolean;
}

const VOTE_LABELS: Record<VoteChoice, string> = {
  FOR: "For",
  AGAINST: "Against",
  ABSTAIN: "Abstain",
};

const VOTE_DESCRIPTIONS: Record<VoteChoice, string> = {
  FOR: "Support this proposal",
  AGAINST: "Oppose this proposal",
  ABSTAIN: "Neither support nor oppose",
};

const VOTE_ICONS: Record<VoteChoice, typeof ThumbsUp> = {
  FOR: ThumbsUp,
  AGAINST: ThumbsDown,
  ABSTAIN: CircleDashed,
};

const VOTE_COLORS: Record<
  VoteChoice,
  {
    selected: string;
    iconSelected: string;
  }
> = {
  FOR: {
    selected: "!bg-green-50 !border-green-500 dark:!bg-green-950/40 dark:!border-green-600",
    iconSelected: "text-green-700 dark:text-green-400",
  },
  AGAINST: {
    selected: "!bg-red-50 !border-red-500 dark:!bg-red-950/40 dark:!border-red-600",
    iconSelected: "text-red-700 dark:text-red-400",
  },
  ABSTAIN: {
    selected: "!bg-gray-100 !border-gray-400 dark:!bg-gray-900/40 dark:!border-gray-600",
    iconSelected: "text-gray-700 dark:text-gray-400",
  },
};

export function VotingControls({
  proposalIdHex,
  status,
  existingUserVote,
  existingUserReason,
  showConfirmedButton,
  onVoteSuccess,
  votingPower,
  votesLoading,
  isDelegating = false,
  delegatedTo,
}: VotingControlsProps) {
  const { address: accountAddress, isConnected } = useAccount();
  const [voteChoice, setVoteChoice] = useState<VoteChoice | null>(existingUserVote ?? null);
  const [reason, setReason] = useState("");
  const [pendingVote, setPendingVote] = useState<{ choice: VoteChoice; reason?: string } | null>(
    null,
  );
  const [delegators, setDelegators] = useState<DelegatorWithCount[]>([]);
  const [delegatorsLoading, setDelegatorsLoading] = useState(false);

  const {
    castVote,
    isConnected: castReady,
    isPending,
    isConfirming,
    isConfirmed,
    pendingHash,
    address: signerAddress,
  } = useCastVote({
    proposalId: proposalIdHex,
  });

  const hasVoted = Boolean(existingUserVote) || Boolean(isConfirmed);
  // Allow voting for all connected users (voting power gating temporarily disabled)
  const eligibleToVote = isConnected;

  useEffect(() => {
    if (existingUserVote) {
      setVoteChoice(existingUserVote);
    }
  }, [existingUserVote]);

  useEffect(() => {
    if (existingUserReason !== undefined && hasVoted) {
      setReason(existingUserReason ?? "");
    }
  }, [existingUserReason, hasVoted]);

  const helperText = useMemo(() => {
    if (!isConnected) return "Connect your wallet to vote";
    if (votesLoading) return "Loading...";
    if (votingPower > 0n) {
      return `You have ${votingPower.toString()} votes (based on snapshot)`;
    }
    return "Your vote will be recorded on-chain";
  }, [isConnected, votesLoading, votingPower]);

  useEffect(() => {
    if (!onVoteSuccess || !pendingVote || !pendingHash || !isConfirmed) {
      return;
    }

    onVoteSuccess({
      choice: pendingVote.choice,
      txHash: pendingHash,
      votes: votingPower,
      voter: signerAddress ?? accountAddress,
      reason: pendingVote.reason,
    });

    setPendingVote(null);
    setReason(pendingVote.reason ?? "");
  }, [
    accountAddress,
    isConfirmed,
    onVoteSuccess,
    pendingHash,
    pendingVote,
    signerAddress,
    votingPower,
  ]);

  useEffect(() => {
    let mounted = true;
    async function loadDelegators() {
      if (!accountAddress) {
        setDelegators([]);
        return;
      }
      try {
        setDelegatorsLoading(true);
        const rows = await fetchDelegatorsWithCounts(accountAddress);
        if (!mounted) return;
        const normalized = accountAddress.toLowerCase();
        // Exclude self row if present; we only want inbound delegations from others.
        setDelegators(rows.filter((r) => r.owner.toLowerCase() !== normalized));
      } catch (error) {
        console.error("[VotingControls] failed to fetch delegators", error);
        if (!mounted) return;
        setDelegators([]);
      } finally {
        if (mounted) setDelegatorsLoading(false);
      }
    }
    loadDelegators();
    return () => {
      mounted = false;
    };
  }, [accountAddress]);

  const isDisabled =
    status !== ProposalStatus.ACTIVE || !eligibleToVote || hasVoted || isPending || isConfirming;
  const shouldShowButton =
    !existingUserVote ||
    Boolean(showConfirmedButton) ||
    isPending ||
    isConfirming ||
    isConfirmed ||
    pendingVote !== null;

  const handleConfirmVote = async () => {
    if (voteChoice) {
      const trimmedReason = reason.trim();
      const normalizedReason = trimmedReason.length > 0 ? trimmedReason : undefined;

      setPendingVote({
        choice: voteChoice,
        reason: normalizedReason,
      });

      await castVote(voteChoice, normalizedReason);
    }
  };

  const delegatedToAnother =
    Boolean(isDelegating) &&
    Boolean(accountAddress && delegatedTo) &&
    delegatedTo!.toLowerCase() !== accountAddress!.toLowerCase();
  const showSignalWarning = isConnected && !votesLoading && votingPower === 0n;

  if (status !== ProposalStatus.ACTIVE) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Voting is closed for this proposal.</p>
      </div>
    );
  }

  if (!eligibleToVote) {
    return (
      <div className="space-y-4" suppressHydrationWarning>
        {helperText ? <p className="text-sm text-muted-foreground">{helperText}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VotingPowerNotice
        isConnected={isConnected}
        votesLoading={votesLoading}
        votingPower={votingPower}
        delegatedToAnother={delegatedToAnother}
        delegatedTo={delegatedTo}
        delegators={delegators}
        delegatorsLoading={delegatorsLoading}
      />

      <RadioGroup
        value={voteChoice ?? undefined}
        onValueChange={(value) => setVoteChoice(value as VoteChoice)}
        disabled={isDisabled}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {(Object.keys(VOTE_LABELS) as VoteChoice[]).map((choice) => {
          const Icon = VOTE_ICONS[choice];
          const isSelected = voteChoice === choice;
          const colors = VOTE_COLORS[choice];
          return (
            <FieldLabel key={choice} htmlFor={`vote-${choice}`}>
              <Field
                orientation="horizontal"
                className={cn("justify-between transition-colors", isSelected && colors.selected)}
              >
                <FieldContent className="flex-row items-center gap-2">
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isSelected ? colors.iconSelected : "text-muted-foreground",
                    )}
                  />
                  <div className="flex flex-col gap-0.5">
                    <FieldTitle>{VOTE_LABELS[choice]}</FieldTitle>
                    <FieldDescription className="text-xs">
                      {VOTE_DESCRIPTIONS[choice]}
                    </FieldDescription>
                  </div>
                </FieldContent>
                <RadioGroupItem id={`vote-${choice}`} value={choice} className="shrink-0" />
              </Field>
            </FieldLabel>
          );
        })}
      </RadioGroup>

      <div className="space-y-2">
        <FieldDescription className="text-xs">Optional comment (shared on-chain)</FieldDescription>
        <Textarea
          id="vote-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Share context for your vote"
          className="min-h-24"
          disabled={isDisabled}
        />
      </div>

      {helperText && !hasVoted && !showSignalWarning ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}

      {shouldShowButton ? (
        <Button
          onClick={handleConfirmVote}
          disabled={!voteChoice || !castReady || isPending || isConfirming || hasVoted}
          className="w-full"
          size="lg"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting vote...
            </>
          ) : isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Waiting for confirmation...
            </>
          ) : hasVoted && existingUserVote ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Vote {String(existingUserVote).toLowerCase()} confirmed
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Confirm Vote
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}

export function VotingPowerNotice({
  isConnected,
  votesLoading,
  votingPower,
  delegatedToAnother,
  delegatedTo,
  delegators,
  delegatorsLoading,
}: VotingPowerNoticeProps) {
  const inboundDelegatorsCount = delegators.length;
  const inboundDelegatedVotes = delegators.reduce((acc, curr) => acc + curr.tokenCount, 0);
  const showSignalWarning = isConnected && !votesLoading && votingPower === 0n;
  const topDelegators = delegators.slice(0, 5);

  return (
    <Alert className="border-border/80 bg-muted/30">
      <Users className="h-4 w-4" />
      <AlertTitle>Voting Power & Delegation</AlertTitle>
      <AlertDescription className="mt-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={votingPower > 0n ? "secondary" : "outline"}>
            Voting power: {votesLoading ? "..." : votingPower.toString()}
          </Badge>
          <Badge variant={delegatedToAnother ? "outline" : "secondary"}>
            {delegatedToAnother ? "Delegated to another wallet" : "Self delegated"}
          </Badge>
          {(delegatorsLoading || inboundDelegatorsCount > 0) && (
            <Badge variant="outline">
              Incoming delegators: {delegatorsLoading ? "..." : inboundDelegatorsCount}
            </Badge>
          )}
          {(delegatorsLoading || inboundDelegatedVotes > 0) && (
            <Badge variant="outline">
              Incoming delegated votes: {delegatorsLoading ? "..." : inboundDelegatedVotes}
            </Badge>
          )}
        </div>

        {delegatedToAnother && delegatedTo ? (
          <div className="text-xs">
            Your votes are currently delegated to{" "}
            <AddressDisplay
              address={delegatedTo}
              variant="compact"
              showAvatar={false}
              showCopy={false}
              showExplorer={false}
              truncateLength={8}
              className="align-middle"
            />
            .
          </div>
        ) : null}

        {topDelegators.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Delegations you currently receive:</p>
            <div className="flex flex-wrap items-center gap-2">
              {topDelegators.map((item) => (
                <Badge key={item.owner} variant="outline" className="font-normal">
                  <AddressDisplay
                    address={item.owner}
                    variant="compact"
                    showAvatar={false}
                    showCopy={false}
                    showExplorer={false}
                    truncateLength={6}
                  />
                  <span className="ml-1 text-muted-foreground">({item.tokenCount})</span>
                </Badge>
              ))}
              {inboundDelegatorsCount > topDelegators.length ? (
                <Badge variant="outline">+{inboundDelegatorsCount - topDelegators.length} more</Badge>
              ) : null}
            </div>
          </div>
        ) : null}

        {showSignalWarning ? (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Signal vote only</AlertTitle>
            <AlertDescription>
              You currently have 0 voting power. Your vote will be recorded on-chain as a signal,
              with no weight in the tally.
            </AlertDescription>
          </Alert>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
