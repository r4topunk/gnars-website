"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Address, Hex } from "viem";
import { base } from "wagmi/chains";
import { useAccount, useSimulateContract, useWaitForTransactionReceipt, useWriteContract, useSwitchChain } from "wagmi";
import { GNARS_ADDRESSES } from "@/lib/config";
import { gnarsGovernorAbi } from "@/utils/abis/gnarsGovernorAbi";

type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

const supportMap: Record<VoteChoice, bigint> = {
  AGAINST: 0n,
  FOR: 1n,
  ABSTAIN: 2n,
};

export interface UseCastVoteArgs {
  proposalId?: Hex;
  onSubmitted?: (txHash: Hex) => void;
  onSuccess?: (txHash: Hex, support: VoteChoice) => void;
}

export function useCastVote({ proposalId, onSubmitted, onSuccess }: UseCastVoteArgs) {
  const { address, chain, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const governorAddress = GNARS_ADDRESSES.governor as Address;

  const isReady = Boolean(proposalId) && isConnected && Boolean(address);

  const supportOptions = useMemo(() => Object.keys(supportMap) as VoteChoice[], []);

  const simulateVote = useSimulateContract({
    abi: gnarsGovernorAbi,
    address: governorAddress,
    functionName: "castVote",
    args: proposalId ? [proposalId, supportMap.FOR] : undefined,
    query: {
      enabled: isReady,
    },
    chainId: base.id,
  });

  const { writeContractAsync, data: pendingHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: pendingHash,
    chainId: base.id,
    query: {
      enabled: Boolean(pendingHash),
    },
  });

  const castVote = useCallback(
    async (choice: VoteChoice, reason?: string) => {
      if (!isReady || !proposalId) {
        toast.error("Unable to vote", { description: "Connect wallet and refresh." });
        return;
      }

      const supportValue = supportMap[choice];
      const trimmedReason = reason?.trim();

      try {
        // Check if on correct network, switch if needed
        if (chain?.id !== base.id) {
          toast.info("Switching to Base network...");
          await switchChainAsync({ chainId: base.id });
        }

        let txHash: Hex;

        if (trimmedReason && trimmedReason.length > 0) {
          txHash = await writeContractAsync({
            abi: gnarsGovernorAbi,
            address: governorAddress,
            functionName: "castVoteWithReason",
            args: [proposalId, supportValue, trimmedReason],
            chainId: base.id,
          });
        } else {
          txHash = await writeContractAsync({
            abi: gnarsGovernorAbi,
            address: governorAddress,
            functionName: "castVote",
            args: [proposalId, supportValue],
            chainId: base.id,
          });
        }

        onSubmitted?.(txHash);

        toast("Vote submitted", {
          description: `Transaction: ${txHash.slice(0, 10)}…${txHash.slice(-4)}`,
        });

        onSuccess?.(txHash, choice);
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message ?? "Failed to cast vote")
            : "Failed to cast vote";

        toast.error("Vote failed", {
          description: message,
        });
      }
    },
    [chain, switchChainAsync, governorAddress, isReady, onSubmitted, onSuccess, proposalId, writeContractAsync],
  );

  return {
    isConnected,
    address,
    isReady,
    isPending,
    isConfirming,
    isConfirmed,
    pendingHash,
    supportOptions,
    simulateError: simulateVote.error,
    castVote,
  } as const;
}

