"use client";

import { Timer } from "lucide-react";
import { useAccount } from "wagmi";
import { Countdown } from "@/components/common/Countdown";
import { ExecuteProposalButton } from "@/components/proposals/ExecuteProposalButton";
import { QueueProposalButton } from "@/components/proposals/QueueProposalButton";
import { Proposal } from "@/components/proposals/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
// import { useVotes } from "@/hooks/useVotes";
// import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
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
  const { isConnected } = useAccount();

  // Check if user has voting power (at least 1 Gnar)
  // const { hasVotingPower, isLoading: votesLoading } = useVotes({
  //   chainId: CHAIN.id,
  //   collectionAddress: GNARS_ADDRESSES.token,
  //   governorAddress: GNARS_ADDRESSES.governor,
  //   signerAddress: address ?? undefined,
  // });

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

  // Allow all connected users to perform actions (voting power gating disabled)
  const canPerformAction = isConnected;

  return (
    <Card className="p-6 w-full max-w-2xl mx-auto text-center">
      <div className="flex flex-col gap-4">
        {/* Succeeded state - show Queue button */}
        {status === ProposalStatus.SUCCEEDED && (
          <>
            <div>
              <p className="text-sm text-muted-foreground">Queue this proposal before it expires</p>
            </div>
            {canPerformAction && (
              <div className="mt-2">
                <QueueProposalButton
                  args={[proposalId as `0x${string}`]}
                  proposalId={proposalId}
                  buttonText="Queue Proposal"
                  onSuccess={handleSuccess}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                />
              </div>
            )}
          </>
        )}

        {/* Queued state - show countdown or execute button */}
        {status === ProposalStatus.QUEUED && !isProposalExecutable(proposal) && executableFrom && (
          <Alert>
            <Timer className="h-4 w-4" />
            <AlertTitle>Execution Timelock</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4 mt-2">
              <span>Waiting for security delay</span>
              <Badge variant="secondary" className="text-sm font-bold tabular-nums">
                <Countdown end={executableFrom} onEnd={handleSuccess} />
              </Badge>
            </AlertDescription>
          </Alert>
        )}

        {/* Queued and ready to execute */}
        {isProposalExecutable(proposal) && (
          <>
            <div>
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
            </div>
            {canPerformAction && (
              <div className="mt-2">
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
                  className="w-full bg-blue-600 hover:bg-blue-700"
                />
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
