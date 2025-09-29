"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { Address } from "viem";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCastVote } from "@/hooks/useCastVote";
import { ProposalStatus } from "@/lib/schemas/proposals";

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
  FOR: "Vote For",
  AGAINST: "Vote Against",
  ABSTAIN: "Vote Abstain",
};

const VARIANT_MAP: Record<VoteChoice, "default" | "destructive" | "secondary"> = {
  FOR: "default",
  AGAINST: "destructive",
  ABSTAIN: "secondary",
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
  const eligibleToVote = Boolean(isConnected && hasVotingPower);

  useEffect(() => {
    if (existingUserVote) {
      setVoteChoice(existingUserVote);
    }
  }, [existingUserVote]);

  const helperText = useMemo(() => {
    if (!isConnected) return "Connect your wallet to vote";
    if (votesLoading) return "Checking voting power...";
    if (!hasVotingPower) return "You need at least 1 GNAR delegated to vote";
    if (isDelegating)
      return `Voting power delegated to ${delegatedTo ?? "another address"}`;
    return `You have ${votingPower.toString().trim()} GNAR voting power available`;
  }, [delegatedTo, hasVotingPower, isConnected, isDelegating, votesLoading, votingPower]);

  if (status !== ProposalStatus.ACTIVE) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Voting is closed for this proposal.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {(Object.keys(VOTE_LABELS) as VoteChoice[]).map((choice) => (
            <Button key={choice} disabled variant="outline" className="flex-1">
              {VOTE_LABELS[choice]}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (!eligibleToVote) {
    return helperText ? <p className="text-sm text-muted-foreground">{helperText}</p> : null;
  }

  return (
    <div className="space-y-4">
      {hasVoted && existingUserVote && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-green-600" />
          You voted {existingUserVote.toLowerCase()} on proposal {proposalNumber}
        </div>
      )}

      {pendingHash && (
        <Badge variant="outline" className="flex items-center gap-2 w-fit">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Transaction pending...
        </Badge>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {(Object.keys(VOTE_LABELS) as VoteChoice[]).map((choice) => {
          const isSelected = voteChoice === choice;
          const disabled = !castReady || isPending || isConfirming || hasVoted;

          return (
            <Button
              key={choice}
              onClick={() => {
                setVoteChoice(choice);
                castVote(choice, reason);
              }}
              disabled={disabled}
              variant={isSelected ? VARIANT_MAP[choice] : "outline"}
              className="relative flex-1"
            >
              {isSelected && <Check className="mr-2 h-4 w-4" />}
              {isPending && !pendingHash ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {VOTE_LABELS[choice]}
                </span>
              ) : (
                VOTE_LABELS[choice]
              )}
            </Button>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="vote-reason" className="text-xs text-muted-foreground">
          Optional comment (shared on-chain)
        </Label>
        <Textarea
          id="vote-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Share context for your vote"
          className="min-h-24"
          disabled={hasVoted || isPending || isConfirming}
        />
      </div>

      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}
