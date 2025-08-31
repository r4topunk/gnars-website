import { GNARS_ADDRESSES } from '@/lib/config'
import { subgraphQuery } from '@/lib/subgraph'
import { formatEther } from 'viem'

export type PastAuction = {
  id: string
  tokenId: string
  imageUrl?: string
  finalBid: string
  winner: string
  endTime: Date
  settled: boolean
}

type AuctionsQuery = {
  auctions: Array<{
    id: string
    endTime: string
    settled: boolean
    token: {
      id: string
      tokenId: string
      image?: string | null
    }
    highestBid?: {
      amount: string
      bidder: string
    } | null
    winningBid?: {
      amount: string
      bidder: string
    } | null
    dao: { id: string }
  }>
}

const AUCTIONS_GQL = /* GraphQL */ `
  query RecentSettledAuctions($where: Auction_filter, $first: Int!) {
    auctions(where: $where, orderBy: endTime, orderDirection: desc, first: $first) {
      id
      endTime
      settled
      token { id tokenId image }
      highestBid { amount bidder }
      winningBid { amount bidder }
      dao { id }
    }
  }
`

export async function fetchRecentAuctions(limit: number): Promise<PastAuction[]> {
  const where = {
    dao: GNARS_ADDRESSES.token.toLowerCase(),
    settled: true,
    bidCount_gt: 0,
  }

  const data = await subgraphQuery<AuctionsQuery>(AUCTIONS_GQL, {
    where,
    first: limit,
  })

  const toHttp = (uri?: string | null): string | undefined => {
    if (!uri) return undefined
    if (uri.startsWith('ipfs://')) {
      return uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
    }
    return uri
  }

  return (data.auctions || []).map((a) => {
    const amountWei = a.winningBid?.amount ?? a.highestBid?.amount ?? '0'
    const amountEth = formatEther(BigInt(amountWei))
    const winner = a.winningBid?.bidder ?? a.highestBid?.bidder ?? '0x0000000000000000000000000000000000000000'

    return {
      id: a.id ?? a.token.id,
      tokenId: a.token.tokenId,
      imageUrl: toHttp(a.token.image) ?? undefined,
      finalBid: parseFloat(amountEth).toFixed(3),
      winner,
      endTime: new Date(Number(a.endTime) * 1000),
      settled: a.settled,
    }
  })
}


