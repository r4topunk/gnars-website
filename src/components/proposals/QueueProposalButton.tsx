"use client";

import { useCallback, useState } from "react";
import { useSimulateContract, useWriteContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [open, setOpen] = useState(false);

  const { data: simulateData, isError: simulateError } = useSimulateContract({
    address: GNARS_ADDRESSES.governor as `0x${string}`,
    abi: gnarsGovernorAbi,
    functionName: "queue",
    args,
    chainId: CHAIN.id,
    query: { enabled: !disabled && !isPending },
  });

  const { writeContractAsync } = useWriteContract();

  const handleConfirm = useCallback(async () => {
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
      setOpen(false);

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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button disabled={isDisabled} className={className} size="lg">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Queueing...
            </>
          ) : (
            buttonText
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Queue Proposal</AlertDialogTitle>
          <AlertDialogDescription>
            This will queue the proposal for execution after the timelock delay. This action is irreversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Queueing...
              </>
            ) : (
              "Continue"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


