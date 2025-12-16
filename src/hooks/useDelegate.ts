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
      console.log("[useDelegate] delegate called:", {
        delegatee,
        isReady,
        currentChain: chain?.id,
        targetChain: base.id,
        tokenAddress,
      });

      if (!isReady) {
        console.warn("[useDelegate] Not ready to delegate");
        toast.error("Unable to delegate", { description: "Connect wallet and refresh." });
        return;
      }

      // Validate address
      if (!isAddress(delegatee)) {
        console.error("[useDelegate] Invalid address:", delegatee);
        toast.error("Invalid address", { description: "Please enter a valid Ethereum address." });
        return;
      }

      const delegateeAddress = delegatee as Address;
      console.log("[useDelegate] Validated delegatee address:", delegateeAddress);

      try {
        // Check if on correct network, switch if needed
        if (chain?.id !== base.id) {
          console.log("[useDelegate] Wrong network, switching to Base...", { from: chain?.id, to: base.id });
          toast.info("Switching to Base network...");
          await switchChainAsync({ chainId: base.id });
          console.log("[useDelegate] Successfully switched to Base");
        }

        console.log("[useDelegate] Calling writeContractAsync...", {
          abi: "tokenDelegateAbi",
          address: tokenAddress,
          functionName: "delegate",
          args: [delegateeAddress],
        });

        const txHash = await writeContractAsync({
          abi: tokenDelegateAbi,
          address: tokenAddress,
          functionName: "delegate",
          args: [delegateeAddress],
          chainId: base.id,
        });

        console.log("[useDelegate] Transaction submitted:", txHash);

        onSubmitted?.(txHash);

        toast("Delegation submitted", {
          description: `Transaction: ${txHash.slice(0, 10)}…${txHash.slice(-4)}`,
        });

        onSuccess?.(txHash, delegateeAddress);
        console.log("[useDelegate] onSuccess callback executed");
      } catch (err: unknown) {
        console.error("[useDelegate] Error occurred:", err);
        
        // Safely extract error message
        let message = "Unknown error";
        if (typeof err === "string") {
          message = err;
        } else if (err && typeof err === "object" && "message" in err) {
          message = String((err as { message: string }).message);
        }

        console.log("[useDelegate] Error message:", message);

        // Log additional error details if available (only if it's an object)
        if (err && typeof err === "object" && typeof err !== "string") {
          const errorObj = err as any;
          console.error("[useDelegate] Error details:", {
            message: errorObj.message,
            shortMessage: errorObj.shortMessage,
            details: errorObj.details,
            metaMessages: errorObj.metaMessages,
            cause: errorObj.cause,
            version: errorObj.version,
            docsPath: errorObj.docsPath,
            name: errorObj.name,
          });
        }

        // Handle user rejection
        if (message.includes("User rejected") || message.includes("rejected") || message.includes("User denied")) {
          console.log("[useDelegate] User rejected/denied transaction");
          toast.error("Transaction cancelled", {
            description: "You cancelled the transaction",
          });
          return;
        }

        // Handle timeout errors
        if (message.includes("timeout") || message.includes("Request timeout")) {
          console.error("[useDelegate] RPC timeout error");
          toast.error("Network timeout", { 
            description: "RPC request timed out. Please try again or check your network connection." 
          });
          return;
        }

        // Handle contract reverts
        if (message.includes("reverted")) {
          console.error("[useDelegate] Contract reverted");
          toast.error("Transaction failed", { 
            description: "The delegation transaction was reverted. You may not own any tokens to delegate." 
          });
          return;
        }

        console.error("Delegation error:", err);
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
