import { useQuery } from '@tanstack/react-query'
import { fetchRecentAuctions, fetchAllAuctions, type PastAuction } from '@/services/auctions'

export function useRecentAuctions(limit: number) {
  return useQuery<PastAuction[]>({
    queryKey: ['recent-auctions', limit],
    queryFn: () => fetchRecentAuctions(limit),
    refetchOnMount: true,
    staleTime: 0,
  })
}

export function useAllAuctions(limit?: number) {
  return useQuery<PastAuction[]>({
    queryKey: ['all-auctions', limit],
    queryFn: () => fetchAllAuctions(limit),
    refetchOnMount: true,
    staleTime: 0,
  })
}


