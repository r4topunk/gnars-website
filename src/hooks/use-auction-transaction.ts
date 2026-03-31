"use client";

import { useCallback, useEffect, useState } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import { CHAIN } from "@/lib/config";

export type TxPhase = "idle" | "wallet_confirm" | "submitted" | "confirmed";

interface UseAuctionTransactionOptions {
  /** Called when TX is confirmed onchain */
  onConfirmed?: (hash: `0x${string}`) => void;
  /** Called when TX fails at any phase */
  onError?: (error: Error) => void;
}

interface UseAuctionTransactionReturn {
  /** Current phase of the transaction lifecycle */
  phase: TxPhase;
  /** The TX hash once submitted */
  txHash: `0x${string}` | undefined;
  /** Whether any TX is in progress (not idle) */
  isActive: boolean;
  /** Button label for current phase */
  buttonLabel: (idle: string) => string;
  /**
   * Execute a transaction. Pass an async function that calls
   * writeContractAsync or sendTransactionAsync and returns the hash.
   */
  execute: (txFn: () => Promise<`0x${string}`>) => Promise<void>;
  /** Reset back to idle (e.g., after confirmed toast) */
  reset: () => void;
}

export function useAuctionTransaction(
  options: UseAuctionTransactionOptions = {},
): UseAuctionTransactionReturn {
  const { onConfirmed, onError } = options;
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: CHAIN.id,
  });

  // Transition: submitted → confirmed
  useEffect(() => {
    if (isConfirmed && txHash && phase === "submitted") {
      setPhase("confirmed");
      onConfirmed?.(txHash);
    }
  }, [isConfirmed, txHash, phase, onConfirmed]);

  const execute = useCallback(
    async (txFn: () => Promise<`0x${string}`>) => {
      try {
        setPhase("wallet_confirm");
        const hash = await txFn();
        setTxHash(hash);
        setPhase("submitted");
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Transaction failed");
        onError?.(error);
        setPhase("idle");
        setTxHash(undefined);
      }
    },
    [onError],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setTxHash(undefined);
  }, []);

  const buttonLabel = useCallback(
    (idle: string) => {
      switch (phase) {
        case "wallet_confirm":
          return "Confirm in wallet...";
        case "submitted":
          return "Transaction submitted...";
        case "confirmed":
          return "Confirmed!";
        default:
          return idle;
      }
    },
    [phase],
  );

  return {
    phase,
    txHash,
    isActive: phase !== "idle",
    buttonLabel,
    execute,
    reset,
  };
}
