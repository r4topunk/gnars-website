import { useState } from "react";
import { useAccount, useSendTransaction, usePublicClient } from "wagmi";
import { createTradeCall, type TradeParameters } from "@zoralabs/coins-sdk";
import { encodeFunctionData, type Address, type Hex } from "viem";

// Multicall3 address (same on all EVM chains)
const MULTICALL3: Address = "0xcA11bde05977b3631167028862bE2a173976CA11";

// Multicall3 ABI for aggregate3Value
const MULTICALL3_ABI = [
  {
    name: "aggregate3Value",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "value", type: "uint256" },
          { name: "callData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      {
        name: "returnData",
        type: "tuple[]",
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
      },
    ],
  },
] as const;

export interface CoinToBuy {
  address: Address;
  ethAmount: bigint;
}

export interface UseBatchCoinPurchaseParams {
  coins: CoinToBuy[];
  slippageBps?: number;
  onSuccess?: (hash: string) => void;
  onError?: (error: Error) => void;
}

interface MulticallCall {
  target: Address;
  allowFailure: boolean;
  value: bigint;
  callData: Hex;
}

/**
 * Batch purchase multiple content coins in a SINGLE transaction using Multicall3
 * Atomic execution - if one swap fails, all revert
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
  const [isPending, setIsPending] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [preparedCalls, setPreparedCalls] = useState<MulticallCall[]>([]);
  const [totalValue, setTotalValue] = useState<bigint>(BigInt(0));

  const { sendTransactionAsync } = useSendTransaction();

  const executeBatchPurchase = async () => {
    if (!userAddress) {
      const err = new Error("Wallet not connected");
      setError(err);
      onError?.(err);
      throw err;
    }

    if (!publicClient) {
      const err = new Error("Public client not available");
      setError(err);
      onError?.(err);
      throw err;
    }

    try {
      setIsPreparingSwaps(true);
      setError(null);
      setIsConfirmed(false);
      setTxHash(null);

      // ---------------------------------------------------------------------------
      // 1) Generate swap calls for each coin
      // ---------------------------------------------------------------------------
      console.log(`Preparing ${coins.length} swaps...`);

      const calls: MulticallCall[] = [];
      let totalEthValue = BigInt(0);

      for (const coin of coins) {
        const tradeParams: TradeParameters = {
          sell: { type: "eth" },
          buy: { type: "erc20", address: coin.address },
          amountIn: coin.ethAmount,
          slippage: slippageBps / 10000,
          sender: userAddress,
        };

        const quoteResp = await createTradeCall(tradeParams);

        if (!quoteResp.success) {
          console.warn(`Quote failed for ${coin.address}, skipping`);
          continue;
        }

        calls.push({
          target: quoteResp.call.target as Address,
          allowFailure: false, // Atomic: if one fails, revert all
          value: BigInt(quoteResp.call.value),
          callData: quoteResp.call.data as Hex,
        });

        totalEthValue += BigInt(quoteResp.call.value);
      }

      if (calls.length === 0) {
        throw new Error("No valid swap calls generated");
      }

      setPreparedCalls(calls);
      setTotalValue(totalEthValue);

      console.log(`Prepared ${calls.length} swaps, total: ${Number(totalEthValue) / 1e18} ETH`);

      // ---------------------------------------------------------------------------
      // 2) Encode multicall data
      // ---------------------------------------------------------------------------
      const multicallData = encodeFunctionData({
        abi: MULTICALL3_ABI,
        functionName: "aggregate3Value",
        args: [calls],
      });

      // ---------------------------------------------------------------------------
      // 3) Simulate transaction before sending
      // ---------------------------------------------------------------------------
      console.log("Simulating transaction...");

      try {
        await publicClient.call({
          account: userAddress,
          to: MULTICALL3,
          data: multicallData,
          value: totalEthValue,
        });
        console.log("Simulation OK");
      } catch (simError: unknown) {
        const message = simError instanceof Error ? simError.message : String(simError);
        console.error("Simulation failed:", message);
        throw new Error(`Transaction would fail: ${message}`);
      }

      setIsPreparingSwaps(false);
      setIsPending(true);

      // ---------------------------------------------------------------------------
      // 4) Send single multicall transaction
      // ---------------------------------------------------------------------------
      console.log("Sending batch transaction...");

      const hash = await sendTransactionAsync({
        to: MULTICALL3,
        data: multicallData,
        value: totalEthValue,
      });

      console.log(`Tx hash: ${hash}`);
      setTxHash(hash);

      // ---------------------------------------------------------------------------
      // 5) Wait for confirmation
      // ---------------------------------------------------------------------------
      console.log("Waiting for confirmation...");

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted");
      }

      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

      setIsConfirmed(true);
      setIsPending(false);
      onSuccess?.(hash);

      return hash;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsPreparingSwaps(false);
      setIsPending(false);
      onError?.(error);
      throw error;
    }
  };

  return {
    executeBatchPurchase,
    isPreparing: isPreparingSwaps,
    isPending,
    isConfirmed,
    error,
    txHash,
    // Legacy compatibility
    id: txHash,
    currentSwapIndex: 0,
    totalSwaps: preparedCalls.length || coins.length,
    completedSwaps: isConfirmed ? preparedCalls.length : 0,
    swapCalls: preparedCalls,
    totalValue,
  };
}
