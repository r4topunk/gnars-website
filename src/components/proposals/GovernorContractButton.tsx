"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useSimulateContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { gnarsGovernorAbi } from "@/utils/abis/gnarsGovernorAbi";
import { GNARS_ADDRESSES, CHAIN } from "@/lib/config";
import { toast } from "sonner";

interface GovernorContractButtonProps {
  functionName: "queue" | "execute";
  args: readonly unknown[];
  proposalId: string;
  buttonText: string;
  onSuccess: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Reusable button component for Governor contract interactions (queue/execute)
 * Handles simulation, transaction submission, and waiting for confirmation
 */
export function GovernorContractButton({
  functionName,
  args,
  proposalId,
  buttonText,
  onSuccess,
  disabled = false,
  className,
}: GovernorContractButtonProps) {
  const [isPending, setIsPending] = useState(false);

  // Simulate contract call to validate before executing
  const { data: simulateData, isError: simulateError } = useSimulateContract({
    address: GNARS_ADDRESSES.governor as `0x${string}`,
    abi: gnarsGovernorAbi,
    functionName: functionName,
    args: args as readonly unknown[],
    chainId: CHAIN.id,
    query: {
      enabled: !disabled && !isPending,
    },
  });

  const { writeContractAsync } = useWriteContract();

  const handleClick = useCallback(async () => {
    if (!writeContractAsync || !simulateData) {
      toast.error("Unable to prepare transaction");
      return;
    }

    try {
      setIsPending(true);
      
      toast.loading(`Submitting ${functionName} transaction...`, { id: proposalId });

      await writeContractAsync(simulateData.request);

      toast.loading("Waiting for confirmation...", { id: proposalId });

      // Wait for transaction to be indexed
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success(`Proposal ${functionName === "queue" ? "queued" : "executed"} successfully!`, {
        id: proposalId,
      });

      setIsPending(false);
      
      // Small delay to allow subgraph to index
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      onSuccess();
    } catch (err) {
      setIsPending(false);
      console.error(`Error ${functionName}ing proposal:`, err);
      
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      
      if (errorMessage.includes("rejected") || errorMessage.includes("denied")) {
        toast.error("Transaction cancelled", { id: proposalId });
      } else {
        toast.error(`Failed to ${functionName} proposal: ${errorMessage}`, { id: proposalId });
      }
    }
  }, [writeContractAsync, simulateData, functionName, proposalId, onSuccess]);

  const isDisabled = disabled || isPending || simulateError || !simulateData;

  return (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      className={className}
      size="lg"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {functionName === "queue" ? "Queueing..." : "Executing..."}
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
}
