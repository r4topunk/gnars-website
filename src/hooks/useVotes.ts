import { useState } from "react";
import { Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";

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
      // Named "blockNumber" in the ABI but the Gnars token uses timestamp-based
      // clock mode (ERC-6372), so this actually expects a timestamp
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
  {
    name: "proposalSnapshot",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

interface UseVotesArgs {
  chainId: 8453;
  collectionAddress?: Address;
  governorAddress?: Address;
  signerAddress?: Address;
  /** @deprecated Use proposalId instead - snapshotBlock from subgraph is a block number but the contract uses timestamps */
  snapshotBlock?: bigint;
  /** Proposal ID (bytes32 hex) - used to fetch the actual snapshot timestamp from the governor */
  proposalId?: `0x${string}`;
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
  proposalId,
  enabled: enabledProp = true,
  voteWeightFromSubgraph,
}: UseVotesArgs): UseVotesResult => {
  const enabled = Boolean(collectionAddress && governorAddress && signerAddress) && enabledProp;
  const hasSubgraphVoteWeight = voteWeightFromSubgraph !== undefined && voteWeightFromSubgraph > 0;

  // Fetch the actual snapshot timestamp from the governor contract.
  // The Gnars governor uses timestamp-based clock mode (ERC-6372), so
  // proposalSnapshot() returns a timestamp, NOT a block number.
  // The subgraph's snapshotBlockNumber is a block number which is wrong
  // to pass to getPastVotes (the token also uses timestamp-based clock).
  const { data: snapshotTimestamp, isLoading: snapshotLoading } = useReadContract({
    address: governorAddress,
    abi: governorAbi,
    functionName: "proposalSnapshot",
    args: proposalId ? [proposalId] : undefined,
    chainId,
    query: {
      enabled: Boolean(governorAddress && proposalId && !hasSubgraphVoteWeight),
      refetchInterval: false,
    },
  });

  const effectiveSnapshot = snapshotTimestamp ?? snapshotBlock;

  // OZ Votes.getPastVotes reverts when the queried timepoint is not strictly
  // in the past (e.g. during the voting-delay window before snapshot elapses).
  // In that case skip the snapshot path and fall back to getVotes so the UI
  // can preview the signer's current voting power instead of erroring.
  // Frozen at mount — if the user sits through the snapshot crossing,
  // a refresh will pick up the correct path.
  const [mountTime] = useState<bigint>(() => BigInt(Math.floor(Date.now() / 1000)));
  const snapshotInFuture = Boolean(
    snapshotTimestamp !== undefined && snapshotTimestamp > mountTime,
  );
  const usingSnapshotQuery = Boolean(
    effectiveSnapshot && !hasSubgraphVoteWeight && !snapshotInFuture,
  );

  const { data, isLoading: contractsLoading, error } = useReadContracts({
    query: {
      enabled: enabled && (!proposalId || !snapshotLoading || hasSubgraphVoteWeight),
      refetchInterval: false,
    },
    contracts: enabled
      ? (usingSnapshotQuery // Skip getPastVotes if we have subgraph data
          ? [
              {
                address: collectionAddress!,
                abi: tokenAbi,
                functionName: "getPastVotes",
                args: [signerAddress!, effectiveSnapshot!],
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

  const isLoading = snapshotLoading || contractsLoading;

  if (!enabled || !data || isLoading) {
    return { ...emptyResult, isLoading };
  }

  // Debug log for troubleshooting voting power display issues
  if (process.env.NODE_ENV === 'development' && usingSnapshotQuery) {
    console.log('[useVotes] Using snapshot query', {
      snapshotTimestamp: snapshotTimestamp?.toString(),
      snapshotBlockFromSubgraph: snapshotBlock?.toString(),
      effectiveSnapshot: effectiveSnapshot?.toString(),
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
        snapshotTimestamp: snapshotTimestamp?.toString() ?? 'N/A',
        effectiveSnapshot: effectiveSnapshot?.toString() ?? 'N/A',
      });
    }
    return { ...emptyResult, isLoading: false };
  }

  // Additional validation: if using snapshot query and votes is 0, log for debugging
  // (helps identify RPC cache/stale data issues)
  if (usingSnapshotQuery && votes === 0n && process.env.NODE_ENV === 'development') {
    console.info('[useVotes] getPastVotes returned 0 at snapshot', {
      snapshotTimestamp: snapshotTimestamp?.toString(),
      effectiveSnapshot: effectiveSnapshot?.toString(),
      signerAddress,
      delegates,
      note: 'If user has delegations, this may indicate the snapshot timestamp was not fetched correctly',
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
