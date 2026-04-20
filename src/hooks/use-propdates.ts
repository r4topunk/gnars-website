"use client";

import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { prepareTransaction, sendTransaction, waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
import { encodeFunctionData, type Hex } from "viem";
import { useUserAddress } from "@/hooks/use-user-address";
import { useWriteAccount } from "@/hooks/use-write-account";
import { EAS_CONTRACT_ADDRESS, easAbi } from "@/lib/eas";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain } from "@/lib/thirdweb-tx";
import { createPropdate as encodePropdateRequest, listPropdates } from "@/services/propdates";

interface CreatePropdateInput {
  proposalId: string;
  messageText: string;
  originalMessageId?: string;
}

export function usePropdates(proposalId: string) {
  const queryClient = useQueryClient();
  const { address, isConnected } = useUserAddress();
  const writer = useWriteAccount();
  const [submissionPhase, setSubmissionPhase] = useState<
    "idle" | "confirming-wallet" | "pending-tx" | "syncing"
  >("idle");
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingHash, setPendingHash] = useState<Hex | null>(null);
  const [hasWriteError, setHasWriteError] = useState(false);
  const pendingProposalIdRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ["propdates", proposalId],
    queryFn: () => listPropdates(proposalId),
    enabled: Boolean(proposalId),
  });

  const handleCreatePropdate = useCallback(
    async (input: CreatePropdateInput, options?: { onSuccess?: (txHash: string) => void }) => {
      setCreateError(null);
      setHasWriteError(false);
      try {
        const targetProposalId = input.proposalId || proposalId;
        if (!targetProposalId) {
          throw new Error("Proposal ID is required");
        }

        if (!isConnected || !address) {
          throw new Error("Connect wallet to create propdate");
        }

        if (!writer) {
          throw new Error("Connect wallet first");
        }

        const client = getThirdwebClient();
        if (!client) {
          throw new Error("Thirdweb client not configured");
        }

        await ensureOnChain(writer.wallet, base);

        pendingProposalIdRef.current = targetProposalId;
        setSubmissionPhase("confirming-wallet");

        const attestationRequest = await encodePropdateRequest(
          targetProposalId,
          input.messageText,
          input.originalMessageId,
        );

        // Skip pre-simulate: browser eth_call fetch can be blocked (CORS,
        // adblock, Farcaster miniapp sandbox) and the wallet simulates
        // internally before signing. See c85d633.
        const attestCalldata = encodeFunctionData({
          abi: easAbi,
          functionName: "attest",
          args: [attestationRequest],
        });

        const tx = prepareTransaction({
          chain: base,
          to: EAS_CONTRACT_ADDRESS,
          data: attestCalldata,
          client,
        });

        const result = await sendTransaction({
          account: writer.account,
          transaction: tx,
        });
        const txHash = result.transactionHash as Hex;

        setSubmissionPhase("pending-tx");
        setPendingHash(txHash);

        await waitForReceipt({ client, chain: base, transactionHash: txHash });

        // Wait for EAS indexer to sync (Base blocks are ~2s, indexer lag ~2-4s)
        setSubmissionPhase("syncing");
        await new Promise((resolve) => setTimeout(resolve, 4000));

        queryClient.invalidateQueries({ queryKey: ["propdates", targetProposalId] });

        setSubmissionPhase("idle");
        setPendingHash(null);
        pendingProposalIdRef.current = null;

        options?.onSuccess?.(txHash);
        return txHash;
      } catch (error) {
        const raw = error instanceof Error ? error.message : "Propdate creation failed";
        const message = raw.includes("Failed to fetch")
          ? "Network error reaching Base RPC. Check connection or try a different wallet."
          : raw.includes("User rejected") || raw.includes("User denied")
            ? "Transaction rejected in wallet."
            : raw.split("\n")[0];
        setCreateError(message);
        setHasWriteError(true);
        pendingProposalIdRef.current = null;
        setSubmissionPhase("idle");
        setPendingHash(null);
        throw error;
      }
    },
    [address, isConnected, proposalId, queryClient, writer],
  );

  return {
    propdates: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createPropdate: handleCreatePropdate,
    isCreating: submissionPhase !== "idle",
    submissionPhase,
    pendingHash,
    createError,
    isWriteError: hasWriteError,
  };
}
