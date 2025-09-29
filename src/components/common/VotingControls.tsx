"use client";

import { useMemo } from "react";
import { Check, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVotes } from "@/hooks/useVotes";
import { useCastVote } from "@/hooks/useCastVote";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { ProposalStatus } from "@/lib/schemas/proposals";

type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

export interface VotingControlsProps {
  proposalIdHex: `0x${string}`;
  proposalNumber: number;
  status: ProposalStatus;
  existingUserVote?: VoteChoice | null;
  onVoteSuccess?: (choice: VoteChoice, txHash: `0x${string}`) => void;
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
}: VotingControlsProps) {
  const { address, isConnected } = useAccount();
  const {
    votingPower,
    hasVotingPower,
    proposalThreshold,
    isDelegating,
    delegatedTo,
    isLoading: votesLoading,
  } = useVotes({
    chainId: CHAIN.id,
    collectionAddress: GNARS_ADDRESSES.token,
    governorAddress: GNARS_ADDRESSES.governor,
    signerAddress: address ?? undefined,
  });

  const {
    castVote,
    isConnected: castReady,
    isPending,
    isConfirming,
    isConfirmed,
    pendingHash,
  } = useCastVote({
    proposalId: proposalIdHex,
    onSuccess: (hash, choice) => onVoteSuccess?.(choice, hash),
  });

  const hasVoted = Boolean(existingUserVote) || Boolean(isConfirmed);

  const helperText = useMemo(() => {
    if (!isConnected) return "Connect your wallet to vote";
    if (votesLoading) return "Checking voting power...";
    if (!hasVotingPower || votingPower <= proposalThreshold)
      return "You need sufficient delegated voting power to participate";
    if (isDelegating) return `Voting power delegated to ${delegatedTo ?? "another address"}`;
    return "";
  }, [delegatedTo, hasVotingPower, isConnected, isDelegating, proposalThreshold, votingPower, votesLoading]);

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
          const isSelected = existingUserVote === choice || isConfirmed;
          const hasPower = hasVotingPower && votingPower > proposalThreshold;
          const disabled = !castReady || isPending || isConfirming || hasVoted || !hasPower;

          return (
            <Button
              key={choice}
              onClick={() => castVote(choice)}
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

      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}
