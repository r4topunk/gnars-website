import { useReadContracts } from 'wagmi'
import { Address } from 'viem'

// Basic ABIs - would normally import from @buildeross/sdk
const tokenAbi = [
  {
    name: 'getVotes',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'delegates',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

const governorAbi = [
  {
    name: 'proposalThreshold',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export const useVotes = ({
  chainId,
  collectionAddress,
  governorAddress,
  signerAddress,
}: {
  chainId: 8453
  collectionAddress?: Address
  governorAddress?: Address
  signerAddress?: Address
}) => {
  const { data, isLoading } = useReadContracts({
    query: {
      enabled: !!collectionAddress && !!governorAddress && !!signerAddress,
    },
    allowFailure: false,
    contracts: [
      {
        address: collectionAddress!,
        abi: tokenAbi,
        functionName: 'getVotes',
        args: [signerAddress!],
        chainId,
      },
      {
        address: collectionAddress!,
        abi: tokenAbi,
        functionName: 'delegates',
        args: [signerAddress!],
        chainId,
      },
      {
        address: governorAddress!,
        abi: governorAbi,
        functionName: 'proposalThreshold',
        chainId,
      },
    ] as const,
  })

  if (!data || isLoading || data.some((d) => d === undefined || d === null)) {
    return {
      isLoading,
      isOwner: false,
      hasThreshold: false,
    }
  }

  const [votes, delegates, proposalThreshold] = data

  return {
    isLoading,
    isDelegating: delegates !== signerAddress,
    delegatedTo: delegates,
    isOwner: votes > 0,
    hasThreshold: votes > proposalThreshold,
    proposalVotesRequired: proposalThreshold + BigInt(1),
    votes,
  }
}