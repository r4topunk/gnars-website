"use client";

import { useState } from "react";
import type { PublicClient, WalletClient } from "viem";
import { SplitsClient } from "@0xsplits/splits-sdk";
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { base } from "thirdweb/chains";
import { viemAdapter } from "thirdweb/adapters/viem";
import { getThirdwebClient } from "@/lib/thirdweb";
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
 * Hook for creating split contracts using 0xSplits SDK.
 * The SDK expects viem walletClient + publicClient, so we bridge from
 * the bridged thirdweb wallet via viemAdapter.
 */
export function useSplitCreation(): UseSplitCreationResult {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [splitAddress, setSplitAddress] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const account = useActiveAccount();
  const wallet = useActiveWallet();

  const createSplit = async (config: SplitConfig): Promise<string | null> => {
    const client = getThirdwebClient();
    if (!client || !account || !wallet) {
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
      // Bridge the bridged thirdweb wallet back into viem shape so the
      // Splits SDK (which expects viem clients) accepts it.
      const walletClient = viemAdapter.wallet.toViem({
        wallet,
        chain: base,
        client,
      }) as unknown as WalletClient;
      const publicClient = viemAdapter.publicClient.toViem({
        chain: base,
        client,
      }) as unknown as PublicClient;

      const splitsClient = new SplitsClient({
        chainId: 8453,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        publicClient: publicClient as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        walletClient: walletClient as any,
        includeEnsNames: false,
      });

      const sdkConfig = prepareSplitConfigForSDK(config);

      const response = await splitsClient.splitV1.createSplit({
        recipients: sdkConfig.recipients,
        distributorFeePercent: sdkConfig.distributorFeePercent,
        controller: sdkConfig.controller,
      });

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
