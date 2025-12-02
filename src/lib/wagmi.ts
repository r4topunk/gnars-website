import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected, metaMask, walletConnect } from "wagmi/connectors";
import { farcasterWallet } from "./farcaster-connector";

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
export const config =
  globalThis.__wagmiConfig ??
  (globalThis.__wagmiConfig = createConfig({
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
      [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"),
    },
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
  }));

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
