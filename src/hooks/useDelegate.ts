"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { Address, Hex, isAddress } from "viem";
import { base } from "wagmi/chains";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
  useSwitchChain,
} from "wagmi";
import { GNARS_ADDRESSES } from "@/lib/config";

// Token ABI for delegation
const tokenDelegateAbi = [
  {
    name: "delegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "delegatee", type: "address" }],
    outputs: [],
  },
] as const;

export interface UseDelegateArgs {
  onSubmitted?: (txHash: Hex) => void;
  onSuccess?: (txHash: Hex, delegatee: Address) => void;
}

export function useDelegate({ onSubmitted, onSuccess }: UseDelegateArgs = {}) {
  const { address, chain, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const tokenAddress = GNARS_ADDRESSES.token as Address;

  const isReady = isConnected && Boolean(address);

  const { writeContractAsync, data: pendingHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: pendingHash,
    chainId: base.id,
    query: {
      enabled: Boolean(pendingHash),
    },
  });

  const delegate = useCallback(
    async (delegatee: string) => {
      if (!isReady) {
        toast.error("Unable to delegate", { description: "Connect wallet and refresh." });
        return;
      }

      // Validate address
      if (!isAddress(delegatee)) {
        toast.error("Invalid address", { description: "Please enter a valid Ethereum address." });
        return;
      }

      const delegateeAddress = delegatee as Address;

      try {
        // Check if on correct network, switch if needed
        if (chain?.id !== base.id) {
          toast.info("Switching to Base network...");
          await switchChainAsync({ chainId: base.id });
        }

        const txHash = await writeContractAsync({
          abi: tokenDelegateAbi,
          address: tokenAddress,
          functionName: "delegate",
          args: [delegateeAddress],
          chainId: base.id,
        });

        onSubmitted?.(txHash);

        toast("Delegation submitted", {
          description: `Transaction: ${txHash.slice(0, 10)}…${txHash.slice(-4)}`,
        });

        onSuccess?.(txHash, delegateeAddress);
      } catch (err: unknown) {
        // Safely extract error message
        let message = "Unknown error";
        if (typeof err === "string") {
          message = err;
        } else if (err && typeof err === "object" && "message" in err) {
          message = String((err as { message: string }).message);
        }

        // Handle user rejection
        if (message.includes("User rejected") || message.includes("rejected") || message.includes("User denied")) {
          toast.error("Transaction cancelled", {
            description: "You cancelled the transaction",
          });
          return;
        }

        // Handle timeout errors
        if (message.includes("timeout") || message.includes("Request timeout")) {
          toast.error("Network timeout", { 
            description: "RPC request timed out. Please try again or check your network connection." 
          });
          return;
        }

        // Handle contract reverts
        if (message.includes("reverted")) {
          toast.error("Transaction failed", { 
            description: "The delegation transaction was reverted. You may not own any tokens to delegate." 
          });
          return;
        }

        toast.error("Delegation failed", { description: message });
      }
    },
    [isReady, chain?.id, tokenAddress, writeContractAsync, switchChainAsync, onSubmitted, onSuccess],
  );

  return {
    delegate,
    isPending,
    isConfirming,
    isConfirmed,
    pendingHash,
  };
}
