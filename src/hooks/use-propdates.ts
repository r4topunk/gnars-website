"use client";

import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { encodeFunctionData, type Hex } from "viem";
import { usePublicClient } from "wagmi";
import { prepareTransaction, waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
import { useActiveWallet, useSendTransaction } from "thirdweb/react";
import { EAS_CONTRACT_ADDRESS, easAbi } from "@/lib/eas";
import { CHAIN } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain } from "@/lib/thirdweb-tx";
import { createPropdate as encodePropdateRequest, listPropdates } from "@/services/propdates";
import { useUserAddress } from "@/hooks/use-user-address";

interface CreatePropdateInput {
  proposalId: string;
  messageText: string;
  originalMessageId?: string;
}

export function usePropdates(proposalId: string) {
  const queryClient = useQueryClient();
  const { address, isConnected } = useUserAddress();
  const wallet = useActiveWallet();
  const sendTx = useSendTransaction();
  const publicClient = usePublicClient({ chainId: CHAIN.id });
  const [submissionPhase, setSubmissionPhase] = useState<
    "idle" | "confirming-wallet" | "pending-tx" | "syncing"
  >("idle");
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingHash, setPendingHash] = useState<Hex | null>(null);
  const pendingProposalIdRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ["propdates", proposalId],
    queryFn: () => listPropdates(proposalId),
    enabled: Boolean(proposalId),
  });

  const handleCreatePropdate = useCallback(
    async (
      input: CreatePropdateInput,
      options?: { onSuccess?: (txHash: string) => void },
    ) => {
      setCreateError(null);
      try {
        const targetProposalId = input.proposalId || proposalId;
        if (!targetProposalId) {
          throw new Error("Proposal ID is required");
        }

        if (!isConnected || !address) {
          throw new Error("Connect wallet to create propdate");
        }

        const client = getThirdwebClient();
        if (!client) {
          throw new Error("Thirdweb client not configured");
        }

        await ensureOnChain(wallet, base);

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

        // Keep the simulation on wagmi's publicClient — simulateContract is a
        // read (eth_call) and stays on the wagmi side of the migration split.
        await publicClient.simulateContract({
          address: EAS_CONTRACT_ADDRESS,
          abi: easAbi,
          functionName: "attest",
          // @ts-expect-error - wagmi type inference issue with complex tuple args
          args: [attestationRequest],
          chainId: CHAIN.id,
        });

        // Encode the attest call ourselves and send via thirdweb's
        // prepareTransaction so we don't have to wrestle with
        // prepareContractCall's type inference on the complex tuple arg.
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

        const result = await sendTx.mutateAsync(tx);
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
        sendTx.reset();

        options?.onSuccess?.(txHash);
        return txHash;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Propdate creation failed";
        setCreateError(message);
        pendingProposalIdRef.current = null;
        setSubmissionPhase("idle");
        setPendingHash(null);
        sendTx.reset();
        throw error;
      }
    },
    [address, isConnected, proposalId, publicClient, queryClient, sendTx, wallet],
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
    isWriteError: Boolean(sendTx.error),
  };
}
