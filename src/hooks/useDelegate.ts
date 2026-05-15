"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
import { isAddress, type Address, type Hex } from "viem";
import { useWriteAccount } from "@/hooks/use-write-account";
import { DAO_ADDRESSES } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain } from "@/lib/thirdweb-tx";

export interface UseDelegateArgs {
  onSubmitted?: (txHash: Hex) => void;
  onSuccess?: (txHash: Hex, delegatee: Address) => void;
}

export function useDelegate({ onSubmitted, onSuccess }: UseDelegateArgs = {}) {
  const writer = useWriteAccount();
  const tokenAddress = DAO_ADDRESSES.token as Address;

  const [isPending, setIsPending] = useState(false);
  const [pendingHash, setPendingHash] = useState<Hex | undefined>(undefined);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const delegate = useCallback(
    async (delegatee: string) => {
      const client = getThirdwebClient();

      if (!client) {
        toast.error("Unable to delegate", {
          description: "Thirdweb client not configured.",
        });
        return;
      }

      if (!writer) {
        toast.error("Unable to delegate", {
          description: "Connect wallet and refresh.",
        });
        return;
      }

      if (!isAddress(delegatee)) {
        toast.error("Invalid address", {
          description: "Please enter a valid Ethereum address.",
        });
        return;
      }

      const delegateeAddress = delegatee as Address;

      setPendingHash(undefined);
      setIsConfirming(false);
      setIsConfirmed(false);
      setIsPending(true);

      try {
        // Chain-switch on the underlying wallet. When the writer is the
        // admin EOA (eoa view), the underlying wallet is still the AA wrap
        // and `ensureOnChain` targets the wallet instance — same behavior
        // as `use-eoa-delegate` to keep the EIP1193 provider aligned.
        await ensureOnChain(writer.wallet, base);

        const contract = getContract({
          client,
          chain: base,
          address: tokenAddress,
        });

        const tx = prepareContractCall({
          contract,
          method: "function delegate(address delegatee)",
          params: [delegateeAddress],
        });

        const result = await sendTransaction({
          account: writer.account,
          transaction: tx,
        });
        const txHash = result.transactionHash as Hex;

        setPendingHash(txHash);
        setIsPending(false);
        onSubmitted?.(txHash);

        toast("Delegation submitted", {
          description: `Transaction: ${txHash.slice(0, 10)}…${txHash.slice(-4)}`,
        });

        setIsConfirming(true);
        await waitForReceipt({
          client,
          chain: base,
          transactionHash: txHash,
        });
        setIsConfirming(false);
        setIsConfirmed(true);

        onSuccess?.(txHash, delegateeAddress);
      } catch (err: unknown) {
        setIsPending(false);
        setIsConfirming(false);

        let message = "Unknown error";
        if (typeof err === "string") {
          message = err;
        } else if (err && typeof err === "object" && "message" in err) {
          message = String((err as { message: string }).message);
        }

        if (
          message.includes("User rejected") ||
          message.includes("rejected") ||
          message.includes("User denied")
        ) {
          toast.error("Transaction cancelled", {
            description: "You cancelled the transaction",
          });
          return;
        }

        if (message.includes("timeout") || message.includes("Request timeout")) {
          toast.error("Network timeout", {
            description:
              "RPC request timed out. Please try again or check your network connection.",
          });
          return;
        }

        if (message.includes("reverted")) {
          toast.error("Transaction failed", {
            description:
              "The delegation transaction was reverted. You may not own any tokens to delegate.",
          });
          return;
        }

        toast.error("Delegation failed", { description: message });
      }
    },
    [writer, tokenAddress, onSubmitted, onSuccess],
  );

  return {
    delegate,
    isPending,
    isConfirming,
    isConfirmed,
    pendingHash,
  };
}
