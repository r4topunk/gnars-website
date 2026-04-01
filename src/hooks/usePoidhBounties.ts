import { useQuery } from '@tanstack/react-query';
import type { PoidhBounty } from '@/types/poidh';

interface UsePoidhBountiesOptions {
  status?: 'open' | 'closed' | 'voting' | 'all';
  limit?: number;
  filterGnarly?: boolean;
}

interface PoidhBountiesResponse {
  bounties: PoidhBounty[];
  total: number;
  cached: boolean;
}

export function usePoidhBounties(options: UsePoidhBountiesOptions = {}) {
  const { status = 'open', limit = 100, filterGnarly = false } = options;

  return useQuery<PoidhBountiesResponse, Error>({
    queryKey: ['poidh-bounties', status, limit, filterGnarly],
    queryFn: async () => {
      const params = new URLSearchParams({
        status,
        limit: limit.toString(),
        filterGnarly: filterGnarly.toString(),
      });

      const res = await fetch(`/api/poidh/bounties?${params}`);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || 'Failed to fetch bounties');
      }

      return res.json();
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 15 * 60 * 1000, // 15 minutes (renamed from cacheTime)
  });
}
