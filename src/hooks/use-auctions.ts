import { useQuery } from '@tanstack/react-query'
import { fetchRecentAuctions, type PastAuction } from '@/services/auctions'

export function useRecentAuctions(limit: number) {
  return useQuery<PastAuction[]>({
    queryKey: ['recent-auctions', limit],
    queryFn: () => fetchRecentAuctions(limit),
    refetchOnMount: true,
    staleTime: 0,
  })
}


