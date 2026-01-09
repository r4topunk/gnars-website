"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CircleDashed, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { Address } from "viem";
import { useAccount } from "wagmi";
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
  hasVotingPower: boolean;
  votingPower: bigint;
  votesLoading: boolean;
  isDelegating: boolean;
  delegatedTo?: Address;
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
  hasVotingPower,
  votingPower,
  votesLoading,
  isDelegating,
  delegatedTo,
}: VotingControlsProps) {
  const { address: accountAddress, isConnected } = useAccount();
  const [voteChoice, setVoteChoice] = useState<VoteChoice | null>(existingUserVote ?? null);
  const [reason, setReason] = useState("");
  const [pendingVote, setPendingVote] = useState<{ choice: VoteChoice; reason?: string } | null>(
    null,
  );

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

      {helperText && !hasVoted && <p className="text-xs text-muted-foreground">{helperText}</p>}

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
              Vote {existingUserVote.toLowerCase()} confirmed
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
