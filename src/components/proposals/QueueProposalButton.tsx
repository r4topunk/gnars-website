"use client";

import { useCallback, useState } from "react";
import { useSimulateContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gnarsGovernorAbi } from "@/utils/abis/gnarsGovernorAbi";
import { CHAIN, GNARS_ADDRESSES } from "@/lib/config";
import { toast } from "sonner";

export interface QueueProposalButtonProps {
  args: readonly [`0x${string}`];
  proposalId: string;
  buttonText: string;
  onSuccess: () => void;
  disabled?: boolean;
  className?: string;
}

export function QueueProposalButton({
  args,
  proposalId,
  buttonText,
  onSuccess,
  disabled = false,
  className,
}: QueueProposalButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const { data: simulateData, isError: simulateError } = useSimulateContract({
    address: GNARS_ADDRESSES.governor as `0x${string}`,
    abi: gnarsGovernorAbi,
    functionName: "queue",
    args,
    chainId: CHAIN.id,
    query: { enabled: !disabled && !isPending },
  });

  const { writeContractAsync } = useWriteContract();

  const handleClick = useCallback(async () => {
    if (!writeContractAsync || !simulateData) {
      toast.error("Unable to prepare transaction");
      return;
    }

    try {
      setIsPending(true);
      toast.loading("Submitting queue transaction...", { id: proposalId });

      await writeContractAsync(simulateData.request);

      toast.loading("Waiting for confirmation...", { id: proposalId });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success("Proposal queued successfully!", { id: proposalId });
      setIsPending(false);

      // Allow subgraph to index
      await new Promise((resolve) => setTimeout(resolve, 3000));
      onSuccess();
    } catch (err) {
      setIsPending(false);
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      if (errorMessage.includes("rejected") || errorMessage.includes("denied")) {
        toast.error("Transaction cancelled", { id: proposalId });
      } else {
        toast.error(`Failed to queue proposal: ${errorMessage}`, { id: proposalId });
      }
    }
  }, [writeContractAsync, simulateData, proposalId, onSuccess]);

  const isDisabled = disabled || isPending || simulateError || !simulateData;

  return (
    <Button onClick={handleClick} disabled={isDisabled} className={className} size="lg">
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Queueing...
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
}


