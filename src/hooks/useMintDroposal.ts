"use client";

import { useCallback, useState } from "react";
import { useAccount, useSimulateContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { toast } from "sonner";
import { parseEther } from "viem";
import { zoraNftMintAbi } from "@/utils/abis/zoraNftMintAbi";

export interface UseMintDroposalArgs {
  tokenAddress: `0x${string}`;
  priceEth: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

export function useMintDroposal({ 
  tokenAddress, 
  priceEth, 
  onSuccess, 
  onError 
}: UseMintDroposalArgs) {
  const [isPending, setIsPending] = useState(false);
  const { address, isConnected } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const isReady = Boolean(tokenAddress) && isConnected && Boolean(address);

  // Simulate the purchase transaction
  const { data: simulateData, isError: simulateError } = useSimulateContract({
    abi: zoraNftMintAbi,
    address: tokenAddress,
    functionName: "purchase",
    args: [1n], // quantity of 1
    value: parseEther(priceEth),
    query: {
      enabled: isReady && !isPending,
    },
    chainId: base.id,
  });

  const { writeContractAsync, data: pendingHash } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: pendingHash,
    query: {
      enabled: Boolean(pendingHash),
    },
  });

  const mint = useCallback(
    async (quantity: number = 1, comment?: string) => {
      if (!isReady || !tokenAddress) {
        toast.error("Unable to mint", { description: "Connect wallet and refresh." });
        return;
      }

      try {
        // Check if on correct network, switch if needed
        if (chain?.id !== base.id) {
          toast.info("Switching to Base network...");
          await switchChainAsync({ chainId: base.id });
        }

        setIsPending(true);
        toast.loading("Preparing mint transaction...");

        const totalPrice = parseEther((parseFloat(priceEth) * quantity).toString());
        
        let txHash: `0x${string}`;
        
        if (comment && comment.trim()) {
          // Use purchaseWithComment if comment is provided
          txHash = await writeContractAsync({
            abi: zoraNftMintAbi,
            address: tokenAddress,
            functionName: "purchaseWithComment",
            args: [BigInt(quantity), comment.trim()],
            value: totalPrice,
            chainId: base.id,
          });
        } else {
          // Use regular purchase function
          txHash = await writeContractAsync({
            abi: zoraNftMintAbi,
            address: tokenAddress,
            functionName: "purchase",
            args: [BigInt(quantity)],
            value: totalPrice,
            chainId: base.id,
          });
        }

        toast.loading("Waiting for confirmation...", {
          description: `Transaction: ${txHash.slice(0, 10)}…${txHash.slice(-4)}`,
        });

        onSuccess?.(txHash);
      } catch (err: unknown) {
        setIsPending(false);
        const error = err instanceof Error ? err : new Error("Mint failed");
        const message = error.message;

        if (message.includes("rejected") || message.includes("denied")) {
          toast.error("Transaction cancelled");
        } else if (message.includes("insufficient funds")) {
          toast.error("Insufficient funds", {
            description: "You don't have enough ETH to complete this purchase.",
          });
        } else if (message.includes("sale not active")) {
          toast.error("Sale not active", {
            description: "The sale is not currently active.",
          });
        } else {
          toast.error("Mint failed", {
            description: message,
          });
        }

        onError?.(error);
      }
    },
    [
      chain,
      switchChainAsync,
      tokenAddress,
      isReady,
      priceEth,
      onSuccess,
      onError,
      writeContractAsync,
    ],
  );

  // Handle successful transaction
  if (isSuccess && pendingHash) {
    toast.success("Successfully minted!", {
      description: `Transaction: ${pendingHash.slice(0, 10)}…${pendingHash.slice(-4)}`,
    });
    setIsPending(false);
  }

  return {
    isConnected,
    address,
    isReady,
    isPending: isPending || isConfirming,
    isSuccess,
    simulateError,
    mint,
  };
}
