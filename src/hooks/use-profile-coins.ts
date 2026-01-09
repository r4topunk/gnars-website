import { useQuery } from "@tanstack/react-query";
import { getProfileCoins, setApiKey } from "@zoralabs/coins-sdk";

// Track API key configuration status
let isApiKeyConfigured = false;

// Initialize API key
if (typeof window !== "undefined") {
  const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;

  if (!apiKey) {
    const message =
      "Missing NEXT_PUBLIC_ZORA_API_KEY environment variable - Zora profile coins will not load";
    console.error(`[use-profile-coins] ${message}`);
    isApiKeyConfigured = false;
  } else {
    setApiKey(apiKey);
    isApiKeyConfigured = true;
  }
}

/**
 * Hook to fetch coins created by a user
 */
export function useProfileCoins(address: string | undefined, count = 20) {
  return useQuery({
    queryKey: ["profile-coins", address?.toLowerCase(), count],
    queryFn: async () => {
      if (!address) return null;

      // Check API key configuration before making request
      if (!isApiKeyConfigured) {
        console.error(
          "[use-profile-coins] Cannot fetch profile coins - Zora API key not configured",
        );
        return null;
      }

      const response = await getProfileCoins({
        identifier: address.toLowerCase(),
        count,
      });

      return response.data?.profile?.createdCoins ?? null;
    },
    enabled: !!address && isApiKeyConfigured,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
