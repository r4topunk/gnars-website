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
  const usingSnapshotQuery = Boolean(snapshotBlock && !hasSubgraphVoteWeight);

  const { data, isLoading, error } = useReadContracts({
    query: {
      enabled,
      refetchInterval: false,
    },
    contracts: enabled
      ? (usingSnapshotQuery // Skip getPastVotes if we have subgraph data
          ? [
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

  // Debug log for troubleshooting voting power display issues
  if (process.env.NODE_ENV === 'development' && usingSnapshotQuery) {
    console.log('[useVotes] Using snapshot query', {
      snapshotBlock: snapshotBlock?.toString(),
      signerAddress,
      data: data.map(d => ({ status: d.status, result: d.result?.toString(), error: d.error })),
      error,
    });
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
  const votesResult = data[0];
  const delegatesResult = data[1];
  const proposalThresholdResult = data[2];

  // Check for errors in contract calls
  if (votesResult?.status === 'failure' || delegatesResult?.status === 'failure' || proposalThresholdResult?.status === 'failure') {
    if (process.env.NODE_ENV === 'development') {
      console.error('[useVotes] Contract call failed', {
        votesError: votesResult?.status === 'failure' ? votesResult.error : null,
        delegatesError: delegatesResult?.status === 'failure' ? delegatesResult.error : null,
        thresholdError: proposalThresholdResult?.status === 'failure' ? proposalThresholdResult.error : null,
      });
    }
  }

  const votes = votesResult?.result as bigint | undefined;
  const delegates = delegatesResult?.result as Address | undefined;
  const proposalThreshold = proposalThresholdResult?.result as bigint | undefined;

  // If getPastVotes returns null/undefined, it might mean the snapshot block is invalid or user had 0 votes at snapshot
  // In this case, we return 0 votes (not undefined) so the UI can show "0 voting power" correctly
  if (votes === undefined || delegates === undefined || proposalThreshold === undefined) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[useVotes] Missing contract data', {
        votes: votes?.toString() ?? 'undefined',
        delegates: delegates ?? 'undefined',
        proposalThreshold: proposalThreshold?.toString() ?? 'undefined',
        usingSnapshotQuery,
        snapshotBlock: snapshotBlock?.toString() ?? 'N/A',
      });
    }
    return { ...emptyResult, isLoading: false };
  }

  // Additional validation: if using snapshot query and votes is 0, log for debugging
  // (helps identify RPC cache/stale data issues)
  if (usingSnapshotQuery && votes === 0n && process.env.NODE_ENV === 'development') {
    console.info('[useVotes] getPastVotes returned 0 at snapshot', {
      snapshotBlock: snapshotBlock?.toString(),
      signerAddress,
      delegates,
      note: 'If user has delegations, this may indicate RPC cache issues or delegations received after snapshot',
    });
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
