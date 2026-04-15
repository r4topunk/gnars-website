"use client";

import "@/lib/storage-shim";
import { cookieStorage, createConfig, createStorage, fallback, http } from "wagmi";
import { arbitrum, base } from "wagmi/chains";

// Multiple Base RPC endpoints for failover
// Ordered by reliability and rate limit tolerance
const BASE_RPC_URLS = [
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

const chains = [base, arbitrum] as const;

/**
 * Create transport configuration with RPC fallback
 * This is SSR-safe and can be called during module initialization
 */
function createTransports() {
  return {
    [base.id]: fallback(
      BASE_RPC_URLS.map((url) =>
        http(url, {
          timeout: 8_000,
          retryCount: 1,
          retryDelay: 500,
        }),
      ),
      {
        rank: false,
        retryCount: BASE_RPC_URLS.length,
        retryDelay: 100,
      },
    ),
    [arbitrum.id]: http("https://arb1.arbitrum.io/rpc", {
      timeout: 8_000,
      retryCount: 2,
    }),
  };
}

/**
 * Create SSR-safe storage configuration
 */
function createSsrStorage() {
  return createStorage({
    storage: cookieStorage,
  });
}

/**
 * Create wagmi configuration.
 *
 * Connectors are intentionally empty: thirdweb owns the connect/login path.
 * Wagmi is kept solely as a read layer — `useReadContract`,
 * `useReadContracts`, `useBalance`, and `useWaitForTransactionReceipt` all
 * work without any connector configured because they target the transports
 * defined above. See Option F migration plan for context.
 */
export function getWagmiConfig() {
  return createConfig({
    chains,
    connectors: [],
    transports: createTransports(),
    ssr: true,
    storage: createSsrStorage(),
  });
}

// Type for the wagmi config (for module augmentation)
export type WagmiConfig = ReturnType<typeof createConfig>;

declare module "wagmi" {
  interface Register {
    config: WagmiConfig;
  }
}
