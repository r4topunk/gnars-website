"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, ThumbsUp, ThumbsDown, CircleDashed } from "lucide-react";
import { useAccount } from "wagmi";
import { Address } from "viem";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { useCastVote } from "@/hooks/useCastVote";
import { ProposalStatus } from "@/lib/schemas/proposals";
import { IS_DEV } from "@/lib/config";
import { cn } from "@/lib/utils";

type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

export interface VotingControlsProps {
  proposalIdHex: `0x${string}`;
  proposalNumber: number;
  status: ProposalStatus;
  existingUserVote?: VoteChoice | null;
  onVoteSuccess?: (choice: VoteChoice, txHash: `0x${string}`) => void;
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

const VOTE_COLORS: Record<VoteChoice, { 
  selected: string;
  iconSelected: string;
}> = {
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
  proposalNumber,
  status,
  existingUserVote,
  onVoteSuccess,
  hasVotingPower,
  votingPower,
  votesLoading,
  isDelegating,
  delegatedTo,
}: VotingControlsProps) {
  const { isConnected } = useAccount();
  const [voteChoice, setVoteChoice] = useState<VoteChoice | null>(existingUserVote ?? null);
  const [reason, setReason] = useState("");

  const {
    castVote,
    isConnected: castReady,
    isPending,
    isConfirming,
    isConfirmed,
    pendingHash,
  } = useCastVote({
    proposalId: proposalIdHex,
    onSuccess: (hash, choice) => {
      onVoteSuccess?.(choice, hash);
      setReason("");
    },
  });

  const hasVoted = Boolean(existingUserVote) || Boolean(isConfirmed);
  // In dev mode, allow voting even without power; otherwise require connection and voting power
  const eligibleToVote = IS_DEV ? isConnected : Boolean(isConnected && hasVotingPower);

  useEffect(() => {
    if (existingUserVote) {
      setVoteChoice(existingUserVote);
    }
  }, [existingUserVote]);

  const helperText = useMemo(() => {
    if (!isConnected) return "Connect your wallet to vote";
    if (votesLoading) return "Checking voting power...";
    if (!hasVotingPower && !IS_DEV) return "You need at least 1 GNAR delegated to vote";
    if (IS_DEV && !hasVotingPower) return "DEV MODE: Voting enabled without voting power";
    if (isDelegating)
      return `Voting power delegated to ${delegatedTo ?? "another address"}`;
    return `You have ${votingPower.toString().trim()} GNAR voting power available`;
  }, [delegatedTo, hasVotingPower, isConnected, isDelegating, votesLoading, votingPower]);

  const isDisabled = status !== ProposalStatus.ACTIVE || !eligibleToVote || hasVoted || isPending || isConfirming;

  const handleConfirmVote = () => {
    if (voteChoice) {
      castVote(voteChoice, reason);
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
    return helperText ? <p className="text-sm text-muted-foreground">{helperText}</p> : null;
  }

  return (
    <div className="space-y-6">
      {hasVoted && existingUserVote && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-green-600" />
          You voted {existingUserVote.toLowerCase()} on proposal {proposalNumber}
        </div>
      )}

      {pendingHash && (isPending || isConfirming) && (
        <Badge variant="outline" className="flex items-center gap-2 w-fit">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Transaction pending...
        </Badge>
      )}

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
            <FieldLabel 
              key={choice} 
              htmlFor={`vote-${choice}`}
            >
              <Field 
                orientation="horizontal" 
                className={cn(
                  "justify-between transition-colors",
                  isSelected && colors.selected
                )}
              >
                <FieldContent className="flex-row items-center gap-2">
                  <Icon className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isSelected ? colors.iconSelected : "text-muted-foreground"
                  )} />
                  <div className="flex flex-col gap-0.5">
                    <FieldTitle>{VOTE_LABELS[choice]}</FieldTitle>
                    <FieldDescription className="text-xs">{VOTE_DESCRIPTIONS[choice]}</FieldDescription>
                  </div>
                </FieldContent>
                <RadioGroupItem id={`vote-${choice}`} value={choice} className="shrink-0" />
              </Field>
            </FieldLabel>
          );
        })}
      </RadioGroup>

      <div className="space-y-2">
        <FieldDescription className="text-xs">
          Optional comment (shared on-chain)
        </FieldDescription>
        <Textarea
          id="vote-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Share context for your vote"
          className="min-h-24"
          disabled={isDisabled}
        />
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      <Button
        onClick={handleConfirmVote}
        disabled={!voteChoice || !castReady || isPending || isConfirming || hasVoted}
        className="w-full"
        size="lg"
      >
        {isPending || isConfirming ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Confirming Vote...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Confirm Vote
          </>
        )}
      </Button>
    </div>
  );
}
