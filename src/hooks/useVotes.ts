import { Address } from "viem";
import { useReadContracts } from "wagmi";

// Basic ABIs - would normally import from @buildeross/sdk
const tokenAbi = [
  {
    name: "getVotes",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getPastVotes",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "blockNumber", type: "uint256" },
    ],
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

interface UseVotesArgs {
  chainId: 8453;
  collectionAddress?: Address;
  governorAddress?: Address;
  signerAddress?: Address;
  snapshotBlock?: bigint;
  enabled?: boolean;
  // Optional: voting power from subgraph (more reliable than getPastVotes)
  voteWeightFromSubgraph?: number;
}

interface UseVotesResult {
  isLoading: boolean;
  votingPower: bigint;
  hasVotingPower: boolean;
  isDelegating: boolean;
  delegatedTo?: Address;
  proposalThreshold: bigint;
  hasThreshold: boolean;
  proposalVotesRequired: bigint;
  votes: bigint;
}

const emptyResult: UseVotesResult = {
  isLoading: false,
  votingPower: 0n,
  hasVotingPower: false,
  isDelegating: false,
  delegatedTo: undefined,
  proposalThreshold: 0n,
  hasThreshold: false,
  proposalVotesRequired: 0n,
  votes: 0n,
};

export const useVotes = ({
  chainId,
  collectionAddress,
  governorAddress,
  signerAddress,
  snapshotBlock,
  enabled: enabledProp = true,
  voteWeightFromSubgraph,
}: UseVotesArgs): UseVotesResult => {
  const enabled = Boolean(collectionAddress && governorAddress && signerAddress) && enabledProp;
  const hasSubgraphVoteWeight = voteWeightFromSubgraph !== undefined && voteWeightFromSubgraph > 0;

  // Determine which query to run based on snapshotBlock and subgraph availability
  const useHistoricalQuery = Boolean(snapshotBlock && !hasSubgraphVoteWeight);

  const { data, isLoading, error } = useReadContracts({
    query: {
      enabled,
      refetchInterval: false,
    },
    // allowFailure is true by default - each call can succeed/fail independently
    contracts: enabled
      ? (useHistoricalQuery
          ? ([
              {
                address: collectionAddress!,
                abi: tokenAbi,
                functionName: "getPastVotes",
                args: [signerAddress!, snapshotBlock!],
                chainId,
              },
              {
                address: collectionAddress!,
                abi: tokenAbi,
                functionName: "delegates",
                args: [signerAddress!],
                chainId,
              },
              {
                address: governorAddress!,
                abi: governorAbi,
                functionName: "proposalThreshold",
                chainId,
              },
            ] as const)
          : ([
              {
                address: collectionAddress!,
                abi: tokenAbi,
                functionName: "getVotes",
                args: [signerAddress!],
                chainId,
              },
              {
                address: collectionAddress!,
                abi: tokenAbi,
                functionName: "delegates",
                args: [signerAddress!],
                chainId,
              },
              {
                address: governorAddress!,
                abi: governorAbi,
                functionName: "proposalThreshold",
                chainId,
              },
            ] as const))
      : [],
  });

  // Return loading state
  if (!enabled || isLoading) {
    return { ...emptyResult, isLoading };
  }

  // Handle query error or no data
  if (!data) {
    if (error) {
      console.error("[useVotes] Contract read error:", error);
    }
    return { ...emptyResult, isLoading: false };
  }

  // Extract results - order is [votes/pastVotes, delegates, threshold]
  const votesResult = data[0];
  const delegatesResult = data[1];
  const thresholdResult = data[2];

  // Check if all calls succeeded
  if (
    votesResult?.status !== "success" ||
    delegatesResult?.status !== "success" ||
    thresholdResult?.status !== "success"
  ) {
    console.warn("[useVotes] One or more contract calls failed:", {
      votesStatus: votesResult?.status,
      votesError: votesResult?.status === "failure" ? votesResult.error : undefined,
      delegatesStatus: delegatesResult?.status,
      thresholdStatus: thresholdResult?.status,
      useHistoricalQuery,
      snapshotBlock: snapshotBlock?.toString(),
      hasSubgraphVoteWeight,
    });
    return { ...emptyResult, isLoading: false };
  }

  // Extract typed results
  const delegates = delegatesResult.result as Address;
  const proposalThreshold = thresholdResult.result as bigint;

  // If we have subgraph vote weight, prefer it over contract votes data
  const votingPower = hasSubgraphVoteWeight
    ? BigInt(voteWeightFromSubgraph!)
    : (votesResult.result as bigint);

  return {
    isLoading: false,
    votingPower,
    hasVotingPower: votingPower > 0n,
    isDelegating: delegates.toLowerCase() !== signerAddress?.toLowerCase(),
    delegatedTo: delegates,
    proposalThreshold,
    hasThreshold: votingPower > proposalThreshold,
    proposalVotesRequired: proposalThreshold + 1n,
    votes: votingPower,
  };
};
