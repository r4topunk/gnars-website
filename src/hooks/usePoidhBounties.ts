import { useQuery } from '@tanstack/react-query';
import type { PoidhBounty } from '@/types/poidh';

interface UsePoidhBountiesParams {
  status?: 'open' | 'closed' | 'all';
  limit?: number;
  filterGnarly?: boolean;
}

interface BountiesResponse {
  bounties: PoidhBounty[];
  total: number;
  cached?: boolean;
}

export function usePoidhBounties(params: UsePoidhBountiesParams = {}) {
  const { status = 'open', limit = 100, filterGnarly = true } = params;

  return useQuery<BountiesResponse>({
    queryKey: ['poidh-bounties', status, limit, filterGnarly],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        status,
        limit: limit.toString(),
        filterGnarly: filterGnarly.toString(),
      });

      const res = await fetch(`/api/poidh/bounties?${searchParams}`);
      if (!res.ok) {
        throw new Error('Failed to fetch bounties');
      }
      return res.json();
    },
    staleTime: 60 * 1000 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
