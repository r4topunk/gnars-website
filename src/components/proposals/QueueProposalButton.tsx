"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
import { useSimulateContract } from "wagmi";
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
import { Button } from "@/components/ui/button";
import { useWriteAccount } from "@/hooks/use-write-account";
import { CHAIN, DAO_ADDRESSES } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain, normalizeTxError } from "@/lib/thirdweb-tx";
import { gnarsGovernorAbi } from "@/utils/abis/gnarsGovernorAbi";

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
  const writer = useWriteAccount();
  const t = useTranslations("proposals");

  const { data: simulateData, isError: simulateError } = useSimulateContract({
    address: DAO_ADDRESSES.governor as `0x${string}`,
    abi: gnarsGovernorAbi,
    functionName: "queue",
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
      toast.error(t("queue.connectError"), { id: proposalId });
      return;
    }

    try {
      setIsPending(true);
      toast.loading(t("queue.submitting"), { id: proposalId });

      await ensureOnChain(writer.wallet, base);

      const contract = getContract({
        client,
        chain: base,
        address: DAO_ADDRESSES.governor as `0x${string}`,
        abi: gnarsGovernorAbi,
      });

      const tx = prepareContractCall({
        contract,
        method: "queue",
        params: args,
      });

      const result = await sendTransaction({
        account: writer.account,
        transaction: tx,
      });
      const txHash = result.transactionHash as `0x${string}`;

      toast.loading(t("queue.waitingConfirmation"), { id: proposalId });
      await waitForReceipt({ client, chain: base, transactionHash: txHash });

      toast.success(t("queue.success"), { id: proposalId });
      setIsPending(false);
      setOpen(false);

      await new Promise((resolve) => setTimeout(resolve, 3000));
      onSuccess();
    } catch (err) {
      setIsPending(false);
      const { category, message } = normalizeTxError(err);
      if (category === "user-rejected") {
        toast.error(t("queue.cancelled"), { id: proposalId });
      } else {
        toast.error(t("queue.failedError", { message }), { id: proposalId });
      }
    }
  }, [writer, args, proposalId, onSuccess, t]);

  const isDisabled = disabled || isPending || simulateError || !simulateData;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button disabled={isDisabled} className={className} size="lg">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("queue.queueing")}
            </>
          ) : (
            buttonText
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("queue.dialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("queue.dialogDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("queue.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("queue.queueing")}
              </>
            ) : (
              t("queue.continue")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
