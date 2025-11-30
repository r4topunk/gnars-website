import { useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { SplitsClient } from "@0xsplits/splits-sdk";
import type { SplitConfig } from "@/lib/splits-utils";
import { prepareSplitConfigForSDK } from "@/lib/splits-utils";

export interface UseSplitCreationResult {
  createSplit: (config: SplitConfig) => Promise<string | null>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  splitAddress: string | null;
  txHash: string | null;
  reset: () => void;
}

/**
 * Hook for creating split contracts using 0xSplits SDK
 */
export function useSplitCreation(): UseSplitCreationResult {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [splitAddress, setSplitAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const createSplit = async (config: SplitConfig): Promise<string | null> => {
    if (!publicClient || !walletClient) {
      const err = new Error("Wallet not connected");
      setError(err);
      setIsError(true);
      throw err;
    }

    setIsPending(true);
    setIsError(false);
    setError(null);
    setIsSuccess(false);
    setSplitAddress(null);
    setTxHash(null);

    try {
      // Initialize Splits SDK client
      const splitsClient = new SplitsClient({
        chainId: 8453, // Base
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        publicClient: publicClient as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        walletClient: walletClient as any,
        includeEnsNames: false,
      });

      // Prepare config for SDK
      const sdkConfig = prepareSplitConfigForSDK(config);

      console.log("Creating split with config:", sdkConfig);

      // Create the split
      const response = await splitsClient.splitV1.createSplit({
        recipients: sdkConfig.recipients,
        distributorFeePercent: sdkConfig.distributorFeePercent,
        controller: sdkConfig.controller,
      });

      console.log("Split created:", response);

      // Extract split address and tx hash from response
      const createdSplitAddress = response.splitAddress;
      const transactionHash = response.event?.transactionHash;

      setSplitAddress(createdSplitAddress);
      setTxHash(transactionHash || null);
      setIsSuccess(true);
      setIsPending(false);

      return createdSplitAddress;
    } catch (err) {
      console.error("Error creating split:", err);
      const error = err instanceof Error ? err : new Error("Failed to create split");
      setError(error);
      setIsError(true);
      setIsPending(false);
      throw error;
    }
  };

  const reset = () => {
    setIsPending(false);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
    setSplitAddress(null);
    setTxHash(null);
  };

  return {
    createSplit,
    isPending,
    isSuccess,
    isError,
    error,
    splitAddress,
    txHash,
    reset,
  };
}
