"use client";

import { useState } from "react";
import { createTradeCall, type TradeParameters } from "@zoralabs/coins-sdk";
import { type Address, encodeFunctionData, type Hex, type PublicClient } from "viem";
import { prepareTransaction, sendTransaction, waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
import { viemAdapter } from "thirdweb/adapters/viem";
import { getThirdwebClient } from "@/lib/thirdweb";
import { useUserAddress } from "@/hooks/use-user-address";
import { useWriteAccount } from "@/hooks/use-write-account";

const MULTICALL3: Address = "0xcA11bde05977b3631167028862bE2a173976CA11";

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
 * Batch purchase multiple content coins in a SINGLE transaction using Multicall3.
 * Atomic execution - if one swap fails, all revert.
 */
export function useBatchCoinPurchase({
  coins,
  slippageBps = 500,
  onSuccess,
  onError,
}: UseBatchCoinPurchaseParams) {
  const { address: userAddress } = useUserAddress();
  const writer = useWriteAccount();
  const [isPreparingSwaps, setIsPreparingSwaps] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [preparedCalls, setPreparedCalls] = useState<MulticallCall[]>([]);
  const [totalValue, setTotalValue] = useState<bigint>(BigInt(0));

  const executeBatchPurchase = async () => {
    if (!userAddress) {
      const err = new Error("Wallet not connected");
      setError(err);
      onError?.(err);
      throw err;
    }

    if (!writer) {
      const err = new Error("Wallet not connected");
      setError(err);
      onError?.(err);
      throw err;
    }

    const client = getThirdwebClient();
    if (!client) {
      const err = new Error("Thirdweb client not configured");
      setError(err);
      onError?.(err);
      throw err;
    }

    try {
      setIsPreparingSwaps(true);
      setError(null);
      setIsConfirmed(false);
      setTxHash(null);

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
          allowFailure: false,
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

      const multicallData = encodeFunctionData({
        abi: MULTICALL3_ABI,
        functionName: "aggregate3Value",
        args: [calls],
      });

      // Simulate via viem public client adapter so we fail fast on bad quotes.
      // Cast via unknown — thirdweb's bundled viem types drift from the
      // project's viem version, but the runtime shape is identical.
      const publicClient = viemAdapter.publicClient.toViem({
        chain: base,
        client,
      }) as unknown as PublicClient;
      try {
        await publicClient.call({
          account: writer.account.address as Address,
          to: MULTICALL3,
          data: multicallData,
          value: totalEthValue,
        });
      } catch (simError: unknown) {
        const message = simError instanceof Error ? simError.message : String(simError);
        console.error("Simulation failed:", message);
        throw new Error(`Transaction would fail: ${message}`);
      }

      setIsPreparingSwaps(false);
      setIsPending(true);

      const tx = prepareTransaction({
        chain: base,
        to: MULTICALL3,
        data: multicallData,
        value: totalEthValue,
        client,
      });

      const result = await sendTransaction({
        account: writer.account,
        transaction: tx,
      });
      const hash = result.transactionHash as `0x${string}`;

      setTxHash(hash);

      const receipt = await waitForReceipt({ client, chain: base, transactionHash: hash });

      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted");
      }

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
    id: txHash,
    currentSwapIndex: 0,
    totalSwaps: preparedCalls.length || coins.length,
    completedSwaps: isConfirmed ? preparedCalls.length : 0,
    swapCalls: preparedCalls,
    totalValue,
  };
}
