import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Hex } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { EAS_CONTRACT_ADDRESS, easAbi } from "@/lib/eas";
import { CHAIN } from "@/lib/config";
import { createPropdate as encodePropdateRequest, listPropdates } from "@/services/propdates";

interface CreatePropdateInput {
  proposalId: string;
  messageText: string;
  originalMessageId?: string;
}

export function usePropdates(proposalId: string) {
  const queryClient = useQueryClient();
  const { address, chain, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: CHAIN.id });
  const {
    writeContractAsync,
    isError: isWriteError,
    reset: resetWrite,
  } = useWriteContract();
  const [submissionPhase, setSubmissionPhase] = useState<"idle" | "confirming-wallet" | "pending-tx" | "syncing">("idle");
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingHash, setPendingHash] = useState<Hex | null>(null);
  const pendingProposalIdRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ["propdates", proposalId],
    queryFn: () => listPropdates(proposalId),
    enabled: Boolean(proposalId),
  });

  const handleCreatePropdate = useCallback(
    async (input: CreatePropdateInput, options?: { onSuccess?: (txHash: string) => void }) => {
      setCreateError(null);
      try {
        const targetProposalId = input.proposalId || proposalId;
        if (!targetProposalId) {
          throw new Error("Proposal ID is required");
        }

        if (!isConnected || !address) {
          throw new Error("Connect wallet to create propdate");
        }

        const targetChainId = CHAIN.id;
        if (chain?.id !== targetChainId) {
          if (!switchChainAsync) {
            throw new Error("Please switch to the Base network");
          }
          await switchChainAsync({ chainId: targetChainId });
        }

        pendingProposalIdRef.current = targetProposalId;
        setSubmissionPhase("confirming-wallet");

        const attestationRequest = await encodePropdateRequest(
          targetProposalId,
          input.messageText,
          input.originalMessageId,
        );

        if (!publicClient) {
          throw new Error("Public client not available");
        }

        // Execute the transaction (wallet simulates internally)
        const txHash = (await writeContractAsync({
          address: EAS_CONTRACT_ADDRESS,
          abi: easAbi,
          functionName: "attest",
          // @ts-expect-error - wagmi type inference issue with complex tuple args
          args: [attestationRequest],
          chainId: targetChainId,
        })) as Hex;

        setSubmissionPhase("pending-tx");
        setPendingHash(txHash);

        await publicClient.waitForTransactionReceipt({ hash: txHash });

        // Wait for EAS indexer to sync (Base blocks are ~2s, indexer lag ~2-4s)
        setSubmissionPhase("syncing");
        await new Promise((resolve) => setTimeout(resolve, 4000));

        queryClient.invalidateQueries({ queryKey: ["propdates", targetProposalId] });

        setSubmissionPhase("idle");
        setPendingHash(null);
        pendingProposalIdRef.current = null;
        resetWrite();

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
        pendingProposalIdRef.current = null;
        setSubmissionPhase("idle");
        setPendingHash(null);
        resetWrite();
        throw error;
      }
    },
    [
      address,
      chain?.id,
      isConnected,
      proposalId,
      publicClient,
      queryClient,
      resetWrite,
      switchChainAsync,
      writeContractAsync,
    ],
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
    isWriteError,
  };
}
