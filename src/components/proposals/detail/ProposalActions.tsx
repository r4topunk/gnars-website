"use client";

import { InfoIcon, Timer } from "lucide-react";
import { useAccount } from "wagmi";
import { Countdown } from "@/components/common/Countdown";
import { QueueProposalButton } from "@/components/proposals/QueueProposalButton";
import { ExecuteProposalButton } from "@/components/proposals/ExecuteProposalButton";
import { Proposal } from "@/components/proposals/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVotes } from "@/hooks/useVotes";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { ProposalStatus } from "@/lib/schemas/proposals";
import { isProposalExecutable, isProposalSuccessful } from "@/lib/utils/proposal-state";

interface ProposalActionsProps {
  proposal: Proposal;
  onActionSuccess: () => void;
}

/**
 * ProposalActions component
 * Shows queue/execute buttons for successful proposals
 *
 * Requirements:
 * - User must be connected
 * - User must have at least 1 Gnar
 * - Time remaining is shown to everyone
 * - Buttons only enabled for qualified users
 */
export function ProposalActions({ proposal, onActionSuccess }: ProposalActionsProps) {
  const { address, isConnected } = useAccount();

  // Check if user has voting power (at least 1 Gnar)
  const { hasVotingPower, isLoading: votesLoading } = useVotes({
    chainId: CHAIN.id,
    collectionAddress: GNARS_ADDRESSES.token,
    governorAddress: GNARS_ADDRESSES.governor,
    signerAddress: address ?? undefined,
  });

  const {
    proposalId,
    status,
    executableFrom,
    expiresAt,
    targets,
    values,
    calldatas,
    descriptionHash,
    proposer,
  } = proposal;

  // Only show for successful proposals
  if (!isProposalSuccessful(status)) {
    return null;
  }

  const handleSuccess = () => {
    onActionSuccess();
  };

  // Determine if user can perform actions
  const canPerformAction = isConnected && hasVotingPower && !votesLoading;

  // Get border color based on state
  const getBorderColor = () => {
    if (status === ProposalStatus.SUCCEEDED) {
      return "border-purple-200 bg-purple-50/50";
    }
    if (isProposalExecutable(proposal)) {
      return "border-blue-200 bg-blue-50/50";
    }
    return "border-border bg-muted/30";
  };

  return (
    <Card className={`${getBorderColor()} p-6 w-fit mx-auto`}>
      <div className="flex flex-col md:flex-row gap-4 md:items-center">
          {/* Succeeded state - show Queue button */}
          {status === ProposalStatus.SUCCEEDED && (
            <>
              <div className="flex-shrink-0">
                {canPerformAction ? (
                  <QueueProposalButton
                    args={[proposalId as `0x${string}`]}
                    proposalId={proposalId}
                    buttonText="Queue Proposal"
                    onSuccess={handleSuccess}
                    className="w-full md:w-auto bg-purple-600 hover:bg-purple-700"
                  />
                ) : (
                  <Button disabled size="lg" className="w-full md:w-auto">
                    Queue Proposal
                  </Button>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Queue this proposal before it expires
                </p>
                {!isConnected && (
                  <Alert className="mt-2">
                    <InfoIcon className="h-4 w-4" />
                    <AlertDescription>Connect your wallet to queue this proposal</AlertDescription>
                  </Alert>
                )}
                {isConnected && !hasVotingPower && !votesLoading && (
                  <Alert className="mt-2">
                    <InfoIcon className="h-4 w-4" />
                    <AlertDescription>You need at least 1 Gnar to queue proposals</AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}

          {/* Queued state - show countdown or execute button */}
          {status === ProposalStatus.QUEUED &&
            !isProposalExecutable(proposal) &&
            executableFrom && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 shrink-0">
                    <Timer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Execution Timelock</p>
                    <p className="text-xs text-muted-foreground">
                      Waiting for security delay
                    </p>
                  </div>
                </div>
                
                <Badge 
                  variant="secondary" 
                  className="text-lg font-bold tabular-nums px-6 py-2"
                >
                  <Countdown end={executableFrom} onEnd={handleSuccess} />
                </Badge>
              </div>
            )}

          {/* Queued and ready to execute */}
          {isProposalExecutable(proposal) && (
            <>
              <div className="flex-shrink-0">
                {canPerformAction ? (
                  <ExecuteProposalButton
                    args={[
                      targets as `0x${string}`[],
                      values.map((v) => BigInt(v)),
                      calldatas as `0x${string}`[],
                      descriptionHash as `0x${string}`,
                      proposer as `0x${string}`,
                    ]}
                    proposalId={proposalId}
                    buttonText="Execute Proposal"
                    onSuccess={handleSuccess}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
                  />
                ) : (
                  <Button disabled size="lg" className="w-full md:w-auto">
                    Execute Proposal
                  </Button>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {expiresAt && (
                    <>
                      There&apos;s{" "}
                      <span className="font-semibold text-blue-600 tabular-nums">
                        <Countdown end={expiresAt} onEnd={handleSuccess} />
                      </span>{" "}
                      left to execute this proposal before it expires
                    </>
                  )}
                  {!expiresAt && "Execute this proposal"}
                </p>
                {!isConnected && (
                  <Alert className="mt-2">
                    <InfoIcon className="h-4 w-4" />
                    <AlertDescription>
                      Connect your wallet to execute this proposal
                    </AlertDescription>
                  </Alert>
                )}
                {isConnected && !hasVotingPower && !votesLoading && (
                  <Alert className="mt-2">
                    <InfoIcon className="h-4 w-4" />
                    <AlertDescription>
                      You need at least 1 Gnar to execute proposals
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </div>
    </Card>
  );
}
