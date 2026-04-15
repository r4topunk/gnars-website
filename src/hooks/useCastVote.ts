"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { type Address, type Hex } from "viem";
import { base as wagmiBase } from "wagmi/chains";
import { useSimulateContract } from "wagmi";
import {
  getContract,
  prepareContractCall,
  readContract,
  sendTransaction,
  waitForReceipt,
} from "thirdweb";
import { base } from "thirdweb/chains";
import { DAO_ADDRESSES } from "@/lib/config";
import { getThirdwebClient } from "@/lib/thirdweb";
import { ensureOnChain, normalizeTxError } from "@/lib/thirdweb-tx";
import { useWriteAccount } from "@/hooks/use-write-account";
import { gnarsGovernorAbi } from "@/utils/abis/gnarsGovernorAbi";

type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

const supportMap: Record<VoteChoice, bigint> = {
  AGAINST: 0n,
  FOR: 1n,
  ABSTAIN: 2n,
};

// Minimal ABIs for the pre-check reads. The governor uses timestamp-based
// clock mode (ERC-6372), so proposalSnapshot() returns a timestamp that
// feeds directly into the token's getPastVotes(). Keeping these inline
// avoids widening the shared governor ABI for a single read path.
const governorSnapshotAbi = [
  {
    name: "proposalSnapshot",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const tokenGetPastVotesAbi = [
  {
    name: "getPastVotes",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "timepoint", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export interface UseCastVoteArgs {
  proposalId?: Hex;
  onSubmitted?: (txHash: Hex) => void;
  onSuccess?: (txHash: Hex, support: VoteChoice) => void;
}

export function useCastVote({ proposalId, onSubmitted, onSuccess }: UseCastVoteArgs) {
  const writer = useWriteAccount();
  const governorAddress = DAO_ADDRESSES.governor as Address;
  const tokenAddress = DAO_ADDRESSES.token as Address;

  // Expose the effective signer so callers (VotingControls) can attribute
  // the onSuccess voter to the actual tx signer, which may be the admin
  // EOA or the smart account depending on view mode.
  const address = writer?.account.address as Address | undefined;
  const isConnected = Boolean(address);

  const isReady = Boolean(proposalId) && isConnected;
  const supportOptions = useMemo(() => Object.keys(supportMap) as VoteChoice[], []);

  const simulateVote = useSimulateContract({
    abi: gnarsGovernorAbi,
    address: governorAddress,
    functionName: "castVote",
    args: proposalId ? [proposalId, supportMap.FOR] : undefined,
    // Explicit `account` so wagmi doesn't try to pull it from an empty
    // connector list (Option F).
    account: address,
    query: { enabled: isReady },
    chainId: wagmiBase.id,
  });

  const [pendingHash, setPendingHash] = useState<Hex | undefined>(undefined);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const castVote = useCallback(
    async (choice: VoteChoice, reason?: string) => {
      const client = getThirdwebClient();
      if (!client) {
        toast.error("Unable to vote", { description: "Thirdweb client not configured." });
        return;
      }
      if (!isReady || !proposalId || !writer) {
        toast.error("Unable to vote", { description: "Connect wallet and refresh." });
        return;
      }

      const supportValue = supportMap[choice];
      const trimmedReason = reason?.trim();

      setPendingHash(undefined);
      setIsConfirming(false);
      setIsConfirmed(false);
      setIsPending(true);

      try {
        // Pre-check: make sure the signer actually has voting power at the
        // proposal's snapshot. In eoa view this reads from the EOA (where
        // Gnars typically live); in sa view it reads from the smart account
        // (usually self-delegated). Either way, if the signer has zero
        // voting power we bail before prompting the wallet.
        const governorReadContract = getContract({
          client,
          chain: base,
          address: governorAddress,
          abi: governorSnapshotAbi,
        });

        const snapshot = await readContract({
          contract: governorReadContract,
          method: "proposalSnapshot",
          params: [proposalId],
        });

        const tokenReadContract = getContract({
          client,
          chain: base,
          address: tokenAddress,
          abi: tokenGetPastVotesAbi,
        });

        const priorVotes = await readContract({
          contract: tokenReadContract,
          method: "getPastVotes",
          params: [writer.account.address as Address, snapshot],
        });

        if (priorVotes === 0n) {
          setIsPending(false);
          toast.error("No voting power", {
            description:
              "Your current signer has no voting power at this proposal's snapshot. If your Gnars are delegated, switch view in the wallet panel or cancel delegation to vote directly.",
          });
          return;
        }

        await ensureOnChain(writer.wallet, base);

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

        const result = await sendTransaction({
          account: writer.account,
          transaction: tx,
        });
        const txHash = result.transactionHash as Hex;

        setPendingHash(txHash);
        setIsPending(false);
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
        setIsPending(false);
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
    [writer, governorAddress, tokenAddress, isReady, onSubmitted, onSuccess, proposalId],
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
