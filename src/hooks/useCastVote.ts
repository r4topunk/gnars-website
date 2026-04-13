"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { type Address, type Hex } from "viem";
import { base as wagmiBase } from "wagmi/chains";
import { useSimulateContract } from "wagmi";
import { getContract, prepareContractCall, waitForReceipt } from "thirdweb";
import { base } from "thirdweb/chains";
import { useActiveAccount, useActiveWallet, useSendTransaction } from "thirdweb/react";
import { DAO_ADDRESSES } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain, normalizeTxError } from "@/lib/thirdweb-tx";
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
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const governorAddress = DAO_ADDRESSES.governor as Address;
  const address = account?.address as Address | undefined;
  const isConnected = Boolean(address);

  const isReady = Boolean(proposalId) && isConnected;
  const supportOptions = useMemo(() => Object.keys(supportMap) as VoteChoice[], []);

  const simulateVote = useSimulateContract({
    abi: gnarsGovernorAbi,
    address: governorAddress,
    functionName: "castVote",
    args: proposalId ? [proposalId, supportMap.FOR] : undefined,
    query: { enabled: isReady },
    chainId: wagmiBase.id,
  });

  const sendTx = useSendTransaction();
  const [pendingHash, setPendingHash] = useState<Hex | undefined>(undefined);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const isPending = sendTx.isPending;

  const castVote = useCallback(
    async (choice: VoteChoice, reason?: string) => {
      const client = getThirdwebClient();
      if (!client) {
        toast.error("Unable to vote", { description: "Thirdweb client not configured." });
        return;
      }
      if (!isReady || !proposalId || !account) {
        toast.error("Unable to vote", { description: "Connect wallet and refresh." });
        return;
      }

      const supportValue = supportMap[choice];
      const trimmedReason = reason?.trim();

      setPendingHash(undefined);
      setIsConfirming(false);
      setIsConfirmed(false);

      try {
        await ensureOnChain(wallet, base);

        const contract = getContract({
          client,
          chain: base,
          address: governorAddress,
          abi: gnarsGovernorAbi,
        });

        const tx =
          trimmedReason && trimmedReason.length > 0
            ? prepareContractCall({
                contract,
                method: "castVoteWithReason",
                params: [proposalId, supportValue, trimmedReason],
              })
            : prepareContractCall({
                contract,
                method: "castVote",
                params: [proposalId, supportValue],
              });

        const result = await sendTx.mutateAsync(tx);
        const txHash = result.transactionHash as Hex;

        setPendingHash(txHash);
        onSubmitted?.(txHash);

        toast("Vote submitted", {
          description: `Transaction: ${txHash.slice(0, 10)}…${txHash.slice(-4)}`,
        });

        setIsConfirming(true);
        await waitForReceipt({ client, chain: base, transactionHash: txHash });
        setIsConfirming(false);
        setIsConfirmed(true);

        onSuccess?.(txHash, choice);
      } catch (err) {
        setIsConfirming(false);
        const { category, message } = normalizeTxError(err);
        if (category === "user-rejected") {
          toast.error("Vote cancelled", { description: "You cancelled the transaction." });
          return;
        }
        if (category === "timeout") {
          toast.error("Network timeout", {
            description: "RPC request timed out. Please try again.",
          });
          return;
        }
        toast.error("Vote failed", { description: message });
      }
    },
    [account, wallet, governorAddress, isReady, onSubmitted, onSuccess, proposalId, sendTx],
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
