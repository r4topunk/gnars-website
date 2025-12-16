import { cookieStorage, createConfig, createStorage, fallback, http } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected, metaMask, walletConnect } from "wagmi/connectors";
import { farcasterWallet } from "./farcaster-connector";

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

declare global {
  var __wagmiConfig: ReturnType<typeof createConfig> | undefined;
}

/**
 * Wagmi configuration with Farcaster mini app support
 * 
 * When running in a Farcaster mini app context, the Farcaster wallet
 * will be available as the first connector option, providing seamless
 * wallet integration for users viewing the app within Warpcast or Base app.
 */
export function createWagmiConfig() {
  return createConfig({
    chains: [base],
    connectors: [
      // Farcaster wallet - first priority when in mini app context
      farcasterWallet(),
      // Injected wallet (MetaMask, etc.)
      injected({
        target: "metaMask",
      }),
      metaMask(),
      walletConnect({
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
      }),
      coinbaseWallet({ appName: "Gnars DAO" }),
    ],
    transports: {
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
        },
      ),
    },
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
  });
}

export const config = createWagmiConfig();

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof createWagmiConfig>;
  }
}
