"use client";

import { Timer } from "lucide-react";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { Countdown } from "@/components/common/Countdown";
import { ExecuteProposalButton } from "@/components/proposals/ExecuteProposalButton";
import { QueueProposalButton } from "@/components/proposals/QueueProposalButton";
import { Proposal } from "@/components/proposals/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
// import { useVotes } from "@/hooks/useVotes";
// import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { ProposalStatus } from "@/lib/schemas/proposals";
import { isProposalSuccessful } from "@/lib/utils/proposal-state";
import { useProposalEta } from "@/hooks/useProposalEta";

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
    expiresAt,
    targets,
    values,
    calldatas,
    descriptionHash,
    proposer,
  } = proposal;

  // Fetch the on-chain ETA from the Governor contract
  const { etaDate: contractEta, isLoading: etaLoading } = useProposalEta(proposalId);

  // State to track if proposal is executable based on contract ETA
  const [isExecutable, setIsExecutable] = useState(false);

  // Determine executability based on contract ETA
  useEffect(() => {
    if (!contractEta) {
      setIsExecutable(false);
      return;
    }

    const now = new Date();
    setIsExecutable(now >= contractEta);
  }, [contractEta]);

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
        {status === ProposalStatus.QUEUED && !isExecutable && contractEta && !etaLoading && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 shrink-0">
                <Timer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Execution Timelock</p>
                <p className="text-xs text-muted-foreground">Waiting for security delay</p>
              </div>
            </div>

            <Badge variant="secondary" className="text-lg font-bold tabular-nums px-6 py-2">
              <Countdown end={contractEta.toISOString()} onEnd={handleSuccess} />
            </Badge>
          </div>
        )}

        {/* Queued and ready to execute */}
        {status === ProposalStatus.QUEUED && isExecutable && contractEta && !etaLoading && (
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
