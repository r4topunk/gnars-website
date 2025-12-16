import { useQuery } from "@tanstack/react-query";
import { fetchAllAuctions, fetchRecentAuctions, type PastAuction } from "@/services/auctions";

export function useRecentAuctions(limit: number) {
  return useQuery<PastAuction[]>({
    queryKey: ["recent-auctions", limit],
    queryFn: () => fetchRecentAuctions(limit),
    staleTime: 30 * 1000, // 30 seconds - balance freshness vs calls
    refetchInterval: false, // Manual refresh only
  });
}

export function useAllAuctions(limit?: number) {
  return useQuery<PastAuction[]>({
    queryKey: ["all-auctions", limit],
    queryFn: () => fetchAllAuctions(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes - historical data doesn't change often
    refetchInterval: false,
  });
}
