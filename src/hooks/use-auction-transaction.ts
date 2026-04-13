"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
import { getThirdwebClient } from "@/lib/thirdweb";

export type TxPhase = "idle" | "wallet_confirm" | "submitted" | "confirmed";

interface UseAuctionTransactionOptions {
  /** Called when TX hash is received (submitted to mempool) */
  onSubmitted?: (hash: `0x${string}`) => void;
  /** Called when TX is confirmed onchain */
  onConfirmed?: (hash: `0x${string}`) => void;
  /** Called when TX fails at any phase */
  onError?: (error: Error) => void;
}

interface UseAuctionTransactionReturn {
  phase: TxPhase;
  txHash: `0x${string}` | undefined;
  isActive: boolean;
  buttonLabel: (idle: string) => string;
  execute: (txFn: () => Promise<`0x${string}`>) => Promise<void>;
  reset: () => void;
}

/**
 * State machine helper for auction bid/settle flows. The caller
 * provides a txFn that resolves to a transaction hash; this hook
 * drives the wallet_confirm -> submitted -> confirmed phases and
 * fires the matching callbacks. Confirmation is done via
 * thirdweb's imperative waitForReceipt so the whole flow is a
 * single sequential async, no effect-driven transitions.
 */
export function useAuctionTransaction(
  options: UseAuctionTransactionOptions = {},
): UseAuctionTransactionReturn {
  const { onSubmitted, onConfirmed, onError } = options;
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const onSubmittedRef = useRef(onSubmitted);
  const onConfirmedRef = useRef(onConfirmed);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onSubmittedRef.current = onSubmitted;
  });
  useEffect(() => {
    onConfirmedRef.current = onConfirmed;
  });
  useEffect(() => {
    onErrorRef.current = onError;
  });

  const execute = useCallback(async (txFn: () => Promise<`0x${string}`>) => {
    try {
      setPhase("wallet_confirm");
      const hash = await txFn();
      setTxHash(hash);
      setPhase("submitted");
      onSubmittedRef.current?.(hash);

      const client = getThirdwebClient();
      if (client) {
        await waitForReceipt({ client, chain: base, transactionHash: hash });
      }

      setPhase("confirmed");
      onConfirmedRef.current?.(hash);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Transaction failed");
      onErrorRef.current?.(error);
      setPhase("idle");
      setTxHash(undefined);
    }
  }, []);

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
