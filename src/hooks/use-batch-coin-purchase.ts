import { useState } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { createTradeCall, type TradeParameters } from "@zoralabs/coins-sdk";
import type { Address } from "viem";

const ZORA_ROUTER = "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD";

export interface CoinToBuy {
  address: Address;
  ethAmount: bigint;
}

export interface UseBatchCoinPurchaseParams {
  coins: CoinToBuy[];
  slippageBps?: number;
  onSuccess?: (id: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Batch purchase multiple content coins sequentially
 * Executes one swap at a time - works with any wallet
 */
export function useBatchCoinPurchase({
  coins,
  slippageBps = 500, // 5% default slippage for volatile content coins
  onSuccess,
  onError,
}: UseBatchCoinPurchaseParams) {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const [isPreparingSwaps, setIsPreparingSwaps] = useState(false);
  const [currentSwapIndex, setCurrentSwapIndex] = useState(0);
  const [completedSwaps, setCompletedSwaps] = useState<string[]>([]);
  const [swapCalls, setSwapCalls] = useState<any[] | null>(null);

  const { sendTransactionAsync } = useSendTransaction();

  const executeBatchPurchase = async () => {
    if (!userAddress) {
      const error = new Error("Wallet not connected");
      onError?.(error);
      throw error;
    }

    try {
      setIsPreparingSwaps(true);
      setCurrentSwapIndex(0);
      setCompletedSwaps([]);

      // Generate swap calls for each coin
      const calls = await Promise.all(
        coins.map(async (coin) => {
          const tradeParams: TradeParameters = {
            sell: { type: "eth" },
            buy: { type: "erc20", address: coin.address },
            amountIn: coin.ethAmount,
            slippage: slippageBps / 10000,
            sender: userAddress,
          };

          const quote = await createTradeCall(tradeParams);
          const targetAddress = (quote.call.target || ZORA_ROUTER) as Address;

          return {
            to: targetAddress,
            data: quote.call.data as `0x${string}`,
            value: BigInt(quote.call.value),
            coinAddress: coin.address,
          };
        })
      );

      setSwapCalls(calls);
      setIsPreparingSwaps(false);

      // Execute swaps sequentially with confirmations
      const txHashes: string[] = [];
      for (let i = 0; i < calls.length; i++) {
        setCurrentSwapIndex(i);
        const call = calls[i];

        try {
          const hash = await sendTransactionAsync({
            to: call.to,
            data: call.data,
            value: call.value,
          });
          
          // Wait for confirmation before proceeding
          if (publicClient) {
            const receipt = await publicClient.waitForTransactionReceipt({ 
              hash,
              confirmations: 2,
            });
            
            if (receipt.status === 'reverted') {
              throw new Error(`Swap ${i + 1} reverted`);
            }
            
            // Small delay to ensure wallet RPC catches up
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          txHashes.push(hash);
          setCompletedSwaps((prev) => [...prev, hash]);
          
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          
          // If it's a user rejection, stop everything
          if (errorMsg.includes('User rejected') || errorMsg.includes('denied')) {
            onError?.(new Error(`Purchase cancelled. Completed ${txHashes.length} of ${calls.length} swaps.`));
            return;
          }
          
          // Continue with remaining swaps even if one fails
        }
      }

      if (txHashes.length === calls.length) {
        onSuccess?.(txHashes.join(","));
      } else {
        onError?.(new Error(`Only ${txHashes.length} of ${calls.length} swaps succeeded`));
      }
    } catch (error) {
      const err = error as Error;
      onError?.(err);
      throw err;
    } finally {
      setIsPreparingSwaps(false);
    }
  };

  const isExecuting = currentSwapIndex > 0 && currentSwapIndex < (swapCalls?.length || 0);
  const isConfirmed = completedSwaps.length === swapCalls?.length && swapCalls?.length > 0;

  return {
    executeBatchPurchase,
    isPreparing: isPreparingSwaps,
    isPending: isExecuting,
    isConfirmed,
    error: null,
    id: completedSwaps.join(","),
    currentSwapIndex,
    totalSwaps: swapCalls?.length || 0,
    completedSwaps: completedSwaps.length,
    swapCalls,
  };
}
