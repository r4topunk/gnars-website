import { useQuery } from "@tanstack/react-query";
import { getProfile, setApiKey, type GetProfileQuery } from "@zoralabs/coins-sdk";

// Initialize API key (same pattern as in other files)
if (typeof window !== "undefined") {
  setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY ?? "");
}

export type ZoraProfile = NonNullable<GetProfileQuery["profile"]>;

/**
 * Hook to fetch Zora profile data for a given address
 */
export function useZoraProfile(address: string | undefined) {
  return useQuery({
    queryKey: ["zora-profile", address?.toLowerCase()],
    queryFn: async () => {
      if (!address) return null;
      
      const response = await getProfile({ identifier: address });
      return response.data?.profile ?? null;
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
