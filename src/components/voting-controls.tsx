"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface VotingControlsProps {
  proposalId: string;
  isActive: boolean;
  hasVoted?: boolean;
  userVote?: "FOR" | "AGAINST" | "ABSTAIN";
  onVote?: (vote: "FOR" | "AGAINST" | "ABSTAIN") => void;
}

export function VotingControls({
  proposalId,
  isActive,
  hasVoted = false,
  userVote,
  onVote,
}: VotingControlsProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [selectedVote, setSelectedVote] = useState<"FOR" | "AGAINST" | "ABSTAIN" | null>(
    userVote || null,
  );

  const handleVote = async (vote: "FOR" | "AGAINST" | "ABSTAIN") => {
    if (!isActive || hasVoted || isVoting) return;

    setIsVoting(true);
    try {
      // In real implementation, this would call the smart contract
      // Example: await castVote(proposalId, vote === "FOR" ? 1 : vote === "AGAINST" ? 0 : 2)

      // Mock delay to simulate transaction
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSelectedVote(vote);
      onVote?.(vote);

      toast.success("Your vote has been cast!", {
        description: `You voted ${vote.toLowerCase()} on proposal #${proposalId}`,
      });
    } catch (error) {
      toast.error("Failed to cast vote", {
        description: "Please try again or check your wallet connection",
      });
      console.error("Voting error:", error);
    } finally {
      setIsVoting(false);
    }
  };

  if (!isActive) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Voting is not available for this proposal</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button disabled variant="outline" className="flex-1">
            Vote For
          </Button>
          <Button disabled variant="outline" className="flex-1">
            Vote Against
          </Button>
          <Button disabled variant="outline" className="flex-1">
            Vote Abstain
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasVoted && userVote && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-green-600" />
          You voted {userVote.toLowerCase()} on this proposal
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => handleVote("FOR")}
          disabled={isVoting || hasVoted}
          variant={selectedVote === "FOR" ? "default" : "outline"}
          className="flex-1 relative"
        >
          {selectedVote === "FOR" && <Check className="h-4 w-4 mr-2" />}
          {isVoting && selectedVote === null ? "Voting..." : "Vote For"}
        </Button>

        <Button
          onClick={() => handleVote("AGAINST")}
          disabled={isVoting || hasVoted}
          variant={selectedVote === "AGAINST" ? "destructive" : "outline"}
          className="flex-1 relative"
        >
          {selectedVote === "AGAINST" && <Check className="h-4 w-4 mr-2" />}
          Vote Against
        </Button>

        <Button
          onClick={() => handleVote("ABSTAIN")}
          disabled={isVoting || hasVoted}
          variant={selectedVote === "ABSTAIN" ? "secondary" : "outline"}
          className="flex-1 relative"
        >
          {selectedVote === "ABSTAIN" && <Check className="h-4 w-4 mr-2" />}
          Vote Abstain
        </Button>
      </div>

      {!hasVoted && (
        <p className="text-xs text-muted-foreground">
          Connect your wallet and ensure you have voting power to participate in governance
        </p>
      )}
    </div>
  );
}
