import { Address } from "viem";
import { useReadContract } from "wagmi";

const tokenAbi = [
  {
    name: "getVotes",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "delegates",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const governorAbi = [
  {
    name: "proposalThreshold",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

interface UseProposalEligibilityArgs {
  chainId: number;
  collectionAddress?: Address;
  governorAddress?: Address;
  signerAddress?: Address;
  enabled?: boolean;
}

export interface ProposalEligibilityResult {
  isLoading: boolean;
  proposalThreshold?: bigint;
  proposalVotesRequired?: bigint;
  votes?: bigint;
  delegatedTo?: Address;
  isDelegating?: boolean;
  hasThreshold?: boolean;
}

/**
 * Fetches the proposal threshold (always, if governorAddress exists) and the
 * user's votes/delegation (only if signerAddress exists).
 *
 * This is intentionally separate from useVotes() because we want threshold
 * information available even before wallet connect, so the UI can pre-render
 * "minimum votes required" with no extra waiting at submit time.
 */
export function useProposalEligibility({
  chainId,
  collectionAddress,
  governorAddress,
  signerAddress,
  enabled: enabledProp = true,
}: UseProposalEligibilityArgs): ProposalEligibilityResult {
  const enabledThreshold = Boolean(governorAddress) && enabledProp;
  const enabledUser = Boolean(collectionAddress && signerAddress) && enabledProp;

  const thresholdRead = useReadContract({
    address: governorAddress as `0x${string}` | undefined,
    abi: governorAbi,
    functionName: "proposalThreshold",
    chainId,
    query: { enabled: enabledThreshold, refetchInterval: false },
  });

  const votesRead = useReadContract({
    address: collectionAddress as `0x${string}` | undefined,
    abi: tokenAbi,
    functionName: "getVotes",
    args: signerAddress ? [signerAddress] : undefined,
    chainId,
    query: { enabled: enabledUser, refetchInterval: false },
  });

  const delegatesRead = useReadContract({
    address: collectionAddress as `0x${string}` | undefined,
    abi: tokenAbi,
    functionName: "delegates",
    args: signerAddress ? [signerAddress] : undefined,
    chainId,
    query: { enabled: enabledUser, refetchInterval: false },
  });

  const proposalThreshold =
    typeof thresholdRead.data === "bigint" ? (thresholdRead.data as bigint) : undefined;
  const votes = typeof votesRead.data === "bigint" ? (votesRead.data as bigint) : undefined;
  const delegatedTo = delegatesRead.data as Address | undefined;

  const proposalVotesRequired =
    proposalThreshold !== undefined ? proposalThreshold + 1n : undefined;

  const hasThreshold =
    votes !== undefined && proposalThreshold !== undefined ? votes > proposalThreshold : undefined;

  const isDelegating =
    Boolean(signerAddress && delegatedTo) && delegatedTo?.toLowerCase() !== signerAddress?.toLowerCase();

  return {
    isLoading: Boolean(thresholdRead.isLoading || votesRead.isLoading || delegatesRead.isLoading),
    proposalThreshold,
    proposalVotesRequired,
    votes,
    delegatedTo,
    isDelegating,
    hasThreshold,
  };
}

