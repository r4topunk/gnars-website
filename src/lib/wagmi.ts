import { cookieStorage, createConfig, createStorage, fallback, http } from "wagmi";
import { base } from "wagmi/chains";

// Multiple Base RPC endpoints for failover
// Ordered by reliability and rate limit tolerance
export const BASE_RPC_URLS = [
  // Custom RPC (if provided)
  ...(process.env.NEXT_PUBLIC_BASE_RPC_URL ? [process.env.NEXT_PUBLIC_BASE_RPC_URL] : []),
  // High-reliability public endpoints (green score, good privacy)
  "https://base.api.pocket.network",
  "https://1rpc.io/base",
  "https://base.meowrpc.com",
  "https://base-rpc.publicnode.com",
  // Additional fallbacks
  "https://api.zan.top/base-mainnet",
  "https://base.llamarpc.com",
  // Cloudflare protected endpoint (last resort, may have rate limits)
  "https://mainnet.base.org",
];

// Export chains for use in Providers
export const chains = [base] as const;

// Export chain type for type safety
export type SupportedChain = (typeof chains)[number];

/**
 * Create transport configuration with RPC fallback
 * This is SSR-safe and can be called during module initialization
 */
export function createTransports() {
  return {
    [base.id]: fallback(
      BASE_RPC_URLS.map((url) =>
        http(url, {
          timeout: 8_000,
          retryCount: 1,
          retryDelay: 500,
        })
      ),
      {
        rank: false, // Disable ranking to use simple round-robin on failure
        retryCount: BASE_RPC_URLS.length, // Try all endpoints
        retryDelay: 100,
      }
    ),
  };
}

/**
 * Create SSR-safe storage configuration
 */
export function createSsrStorage() {
  return createStorage({
    storage: cookieStorage,
  });
}

// Type for the wagmi config (for module augmentation)
export type WagmiConfig = ReturnType<typeof createConfig>;

declare module "wagmi" {
  interface Register {
    config: WagmiConfig;
  }
}
