"use client";

import { useCallback, useState } from "react";
import { useSimulateContract } from "wagmi";
import { Loader2 } from "lucide-react";
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
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
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain, normalizeTxError } from "@/lib/thirdweb-tx";
import { useWriteAccount } from "@/hooks/use-write-account";
import { toast } from "sonner";

export interface ExecuteProposalButtonProps {
  args: readonly [
    readonly `0x${string}`[],
    readonly bigint[],
    readonly `0x${string}`[],
    `0x${string}`,
    `0x${string}`,
  ];
  proposalId: string;
  buttonText: string;
  onSuccess: () => void;
  disabled?: boolean;
  className?: string;
}

export function ExecuteProposalButton({
  args,
  proposalId,
  buttonText,
  onSuccess,
  disabled = false,
  className,
}: ExecuteProposalButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [open, setOpen] = useState(false);
  const writer = useWriteAccount();

  const { data: simulateData, isError: simulateError } = useSimulateContract({
    address: DAO_ADDRESSES.governor as `0x${string}`,
    abi: gnarsGovernorAbi,
    functionName: "execute",
    args,
    chainId: CHAIN.id,
    // Explicit `account` so wagmi doesn't try to pull it from an empty
    // connector list (Option F).
    account: writer?.account.address as `0x${string}` | undefined,
    query: { enabled: !disabled && !isPending && Boolean(writer) },
  });

  const handleConfirm = useCallback(async () => {
    const client = getThirdwebClient();
    if (!client) {
      toast.error("Unable to prepare transaction", {
        id: proposalId,
        description: "Thirdweb client not configured.",
      });
      return;
    }
    if (!writer) {
      toast.error("Connect wallet to execute proposal", { id: proposalId });
      return;
    }

    try {
      setIsPending(true);
      toast.loading("Submitting execute transaction...", { id: proposalId });

      await ensureOnChain(writer.wallet, base);

      const contract = getContract({
        client,
        chain: base,
        address: DAO_ADDRESSES.governor as `0x${string}`,
        abi: gnarsGovernorAbi,
      });

      const tx = prepareContractCall({
        contract,
        method: "execute",
        params: args,
      });

      const result = await sendTransaction({
        account: writer.account,
        transaction: tx,
      });
      const txHash = result.transactionHash as `0x${string}`;

      toast.loading("Waiting for confirmation...", { id: proposalId });
      await waitForReceipt({ client, chain: base, transactionHash: txHash });

      toast.success("Proposal executed successfully!", { id: proposalId });
      setIsPending(false);
      setOpen(false);

      await new Promise((resolve) => setTimeout(resolve, 3000));
      onSuccess();
    } catch (err) {
      setIsPending(false);
      const { category, message } = normalizeTxError(err);
      if (category === "user-rejected") {
        toast.error("Transaction cancelled", { id: proposalId });
      } else {
        toast.error(`Failed to execute proposal: ${message}`, { id: proposalId });
      }
    }
  }, [writer, args, proposalId, onSuccess]);

  const isDisabled = disabled || isPending || simulateError || !simulateData;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button disabled={isDisabled} className={className} size="lg">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing...
            </>
          ) : (
            buttonText
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Execute Proposal</AlertDialogTitle>
          <AlertDialogDescription>
            This will execute the proposal and perform all proposed transactions. This action is
            irreversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
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
