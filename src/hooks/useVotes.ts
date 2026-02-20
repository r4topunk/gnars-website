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

  const { data, isLoading } = useReadContracts({
    query: {
      enabled,
      refetchInterval: false,
    },
    contracts: enabled
      ? (snapshotBlock && !hasSubgraphVoteWeight // Skip getPastVotes if we have subgraph data
          ? [
              {
                address: collectionAddress!,
                abi: tokenAbi,
                functionName: "getPastVotes",
                args: [signerAddress!, snapshotBlock],
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
            ]
          : [
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
            ])
      : [],
  });

  if (!enabled || !data || isLoading) {
    return { ...emptyResult, isLoading };
  }

  // If we have subgraph vote weight, use that instead of contract data.
  // Branch B contracts: [getVotes(data[0]), delegates(data[1]), proposalThreshold(data[2])]
  if (hasSubgraphVoteWeight) {
    const votingPower = BigInt(voteWeightFromSubgraph!);
    const delegates = data[1]?.result as Address | undefined;
    const proposalThreshold = data[2]?.result as bigint | undefined;

    if (delegates === undefined || proposalThreshold === undefined) {
      return { ...emptyResult, isLoading: false };
    }

    return {
      isLoading,
      votingPower,
      hasVotingPower: votingPower > 0n,
      isDelegating: delegates !== signerAddress,
      delegatedTo: delegates,
      proposalThreshold,
      hasThreshold: votingPower > proposalThreshold,
      proposalVotesRequired: proposalThreshold + 1n,
      votes: votingPower,
    };
  }

  // Fall back to contract data
  const votes = data[0]?.result as bigint | undefined;
  const delegates = data[1]?.result as Address | undefined;
  const proposalThreshold = data[2]?.result as bigint | undefined;

  if (votes === undefined || delegates === undefined || proposalThreshold === undefined) {
    return { ...emptyResult, isLoading: false };
  }


  return {
    isLoading,
    votingPower: votes,
    hasVotingPower: votes > 0n,
    isDelegating: delegates !== signerAddress,
    delegatedTo: delegates,
    proposalThreshold,
    hasThreshold: votes > proposalThreshold,
    proposalVotesRequired: proposalThreshold + 1n,
    votes,
  };
};
