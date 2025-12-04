"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import {
  useAccount,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import { base } from "wagmi/chains";
import { toast } from "sonner";
import { parseEther } from "viem";
import { zoraNftMintAbi, ZORA_PROTOCOL_REWARD } from "@/utils/abis/zoraNftMintAbi";
import { GNARS_ADDRESSES } from "@/lib/config";

// Treasury receives referral rewards
const MINT_REFERRAL = GNARS_ADDRESSES.treasury as `0x${string}`;

export interface UseMintDroposalArgs {
  tokenAddress: `0x${string}` | undefined;
  priceEth: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

export function useMintDroposal({
  tokenAddress,
  priceEth,
  onSuccess,
  onError,
}: UseMintDroposalArgs) {
  const [isPending, setIsPending] = useState(false);
  const { address, isConnected, chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const successHandledRef = useRef<string | null>(null);

  // Validate token address - must be a valid address, not "0x" or empty
  const isValidTokenAddress =
    tokenAddress &&
    tokenAddress.length === 42 &&
    tokenAddress !== "0x0000000000000000000000000000000000000000";

  const isReady = isValidTokenAddress && isConnected && Boolean(address);

  // Calculate total price including protocol reward for simulation
  const simulationPrice = parseEther(
    (parseFloat(priceEth) + ZORA_PROTOCOL_REWARD).toFixed(18)
  );

  // Simulate the mintWithRewards transaction
  const { isError: simulateError } = useSimulateContract({
    abi: zoraNftMintAbi,
    address: tokenAddress as `0x${string}`,
    functionName: "mintWithRewards",
    args: [address!, 1n, "", MINT_REFERRAL],
    value: simulationPrice,
    query: {
      enabled: isReady && !isPending && Boolean(address),
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

  // Handle successful transaction in useEffect to prevent multiple toasts
  useEffect(() => {
    if (isSuccess && pendingHash && successHandledRef.current !== pendingHash) {
      successHandledRef.current = pendingHash;
      toast.success("Successfully minted!", {
        description: `Transaction: ${pendingHash.slice(0, 10)}…${pendingHash.slice(-4)}`,
      });
      setIsPending(false);
      onSuccess?.(pendingHash);
    }
  }, [isSuccess, pendingHash, onSuccess]);

  const mint = useCallback(
    async (quantity: number = 1, comment?: string) => {
      if (!isReady || !tokenAddress || !address) {
        toast.error("Unable to mint", {
          description: "Connect wallet and ensure the sale is active.",
        });
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

        // Calculate total price with protocol reward (inline to avoid stale closure)
        const salePrice = parseFloat(priceEth) * quantity;
        const protocolReward = ZORA_PROTOCOL_REWARD * quantity;
        const totalPrice = parseEther((salePrice + protocolReward).toFixed(18));

        // Use mintWithRewards - the modern Zora mint function
        // Treasury receives referral rewards
        const txHash = await writeContractAsync({
          abi: zoraNftMintAbi,
          address: tokenAddress,
          functionName: "mintWithRewards",
          args: [
            address, // recipient
            BigInt(quantity), // quantity
            comment?.trim() || "", // comment
            MINT_REFERRAL, // mintReferral (treasury)
          ],
          value: totalPrice,
          chainId: base.id,
        });

        toast.loading("Waiting for confirmation...", {
          description: `Transaction: ${txHash.slice(0, 10)}…${txHash.slice(-4)}`,
        });
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
        } else if (
          message.includes("Sale_Inactive") ||
          message.includes("sale not active")
        ) {
          toast.error("Sale not active", {
            description: "The sale is not currently active.",
          });
        } else if (message.includes("0x6a1c179e")) {
          toast.error("Invalid configuration", {
            description: "The mint configuration is invalid. Please try again.",
          });
        } else {
          toast.error("Mint failed", {
            description: message.slice(0, 100),
          });
        }

        onError?.(error);
      }
    },
    [
      chain,
      switchChainAsync,
      tokenAddress,
      address,
      isReady,
      priceEth,
      onError,
      writeContractAsync,
    ],
  );

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
