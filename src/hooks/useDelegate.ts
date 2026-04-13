"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { type Address, type Hex, isAddress } from "viem";
import { getContract, prepareContractCall, waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
import { useActiveAccount, useActiveWallet, useSendTransaction } from "thirdweb/react";
import { DAO_ADDRESSES } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";

export interface UseDelegateArgs {
  onSubmitted?: (txHash: Hex) => void;
  onSuccess?: (txHash: Hex, delegatee: Address) => void;
}

export function useDelegate({ onSubmitted, onSuccess }: UseDelegateArgs = {}) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const tokenAddress = DAO_ADDRESSES.token as Address;

  const sendTx = useSendTransaction();
  const [pendingHash, setPendingHash] = useState<Hex | undefined>(undefined);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const isPending = sendTx.isPending;

  const delegate = useCallback(
    async (delegatee: string) => {
      const client = getThirdwebClient();

      if (!client) {
        toast.error("Unable to delegate", {
          description: "Thirdweb client not configured.",
        });
        return;
      }

      if (!account?.address) {
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

      try {
        if (wallet && wallet.getChain()?.id !== base.id) {
          toast.info("Switching to Base network...");
          await wallet.switchChain(base);
        }

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

        const result = await sendTx.mutateAsync(tx);
        const txHash = result.transactionHash as Hex;

        setPendingHash(txHash);
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
    [account?.address, wallet, tokenAddress, sendTx, onSubmitted, onSuccess],
  );

  return {
    delegate,
    isPending,
    isConfirming,
    isConfirmed,
    pendingHash,
  };
}
