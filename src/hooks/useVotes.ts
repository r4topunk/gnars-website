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
}: UseVotesArgs): UseVotesResult => {
  const enabled = Boolean(collectionAddress && governorAddress && signerAddress) && enabledProp;

  const { data, isLoading } = useReadContracts({
    query: {
      enabled,
      refetchInterval: false,
    },
    allowFailure: false,
    contracts: enabled
      ? (snapshotBlock
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

  if (!data || isLoading || data.some((d) => d === undefined || d === null)) {
    return { ...emptyResult, isLoading };
  }

  const [votes, delegates, proposalThreshold] = data as [bigint, Address, bigint];

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
