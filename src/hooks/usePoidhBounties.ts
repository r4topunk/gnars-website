import { useQuery } from "@tanstack/react-query";
import type { PoidhBounty } from "@/types/poidh";

interface UsePoidhBountiesOptions {
  status?: "open" | "closed" | "voting" | "all";
  limit?: number;
  filterGnarly?: boolean;
  initialData?: PoidhBountiesResponse;
}

interface PoidhBountiesResponse {
  bounties: PoidhBounty[];
  total: number;
}

export function usePoidhBounties(options: UsePoidhBountiesOptions = {}) {
  const { status = "open", limit = 100, filterGnarly = false, initialData } = options;

  return useQuery<PoidhBountiesResponse, Error>({
    queryKey: ["poidh-bounties", status, limit, filterGnarly],
    queryFn: async () => {
      const params = new URLSearchParams({
        status,
        limit: limit.toString(),
        filterGnarly: filterGnarly.toString(),
      });

      const res = await fetch(`/api/poidh/bounties?${params}`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || "Failed to fetch bounties");
      }

      return res.json();
    },
    initialData,
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export type { PoidhBountiesResponse };
