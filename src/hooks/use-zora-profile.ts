import { useQuery } from "@tanstack/react-query";
import { getProfile, setApiKey } from "@zoralabs/coins-sdk";

// Track API key configuration status
let isApiKeyConfigured = false;

// Initialize API key
if (typeof window !== "undefined") {
  const apiKey = process.env.NEXT_PUBLIC_ZORA_API_KEY;

  if (!apiKey) {
    const message =
      "Missing NEXT_PUBLIC_ZORA_API_KEY environment variable - Zora profiles will not load";
    console.error(`[use-zora-profile] ${message}`);
    isApiKeyConfigured = false;
  } else {
    setApiKey(apiKey);
    isApiKeyConfigured = true;
  }
}

// Type definition for getProfile response
export type ZoraProfile = {
  id?: string;
  handle?: string;
  displayName?: string;
  avatar?: {
    small?: string;
    medium?: string;
    blurhash?: string;
  };
  creatorCoin?: {
    address?: string;
    name?: string;
    symbol?: string;
    marketCap?: string;
    marketCapDelta24h?: string;
    mediaContent?: {
      previewImage?: {
        small?: string;
        medium?: string;
        blurhash?: string;
      };
    };
  };
};

/**
 * Hook to fetch Zora profile data for a given address
 */
export function useZoraProfile(address: string | undefined) {
  return useQuery({
    queryKey: ["zora-profile", address?.toLowerCase()],
    queryFn: async () => {
      if (!address) return null;

      // Check API key configuration before making request
      if (!isApiKeyConfigured) {
        console.error("[use-zora-profile] Cannot fetch profile - Zora API key not configured");
        return null;
      }

      const response = await getProfile({ identifier: address });
      return response.data?.profile ?? null;
    },
    enabled: !!address && isApiKeyConfigured,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
