"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider } from "wagmi";
import { coinbaseWallet, injected, metaMask, walletConnect } from "wagmi/connectors";
import { chains, createTransports, createSsrStorage } from "@/lib/wagmi";
import { farcasterWallet } from "@/lib/farcaster-connector";

/**
 * Providers component that wraps the app with wagmi, react-query, etc.
 *
 * IMPORTANT: The wagmi config is created inside this Client Component using useState
 * to avoid the "indexedDB is not defined" error. WalletConnect uses IndexedDB for
 * session storage, which only exists in browsers. By creating the config here
 * (inside a 'use client' component), we ensure the connectors are only initialized
 * on the client side.
 *
 * This is the recommended pattern from wagmi v2 documentation for Next.js App Router.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  // Create wagmi config only on client-side using useState
  // This ensures WalletConnect and other browser-only connectors don't break SSR
  const [wagmiConfig] = useState(() =>
    createConfig({
      chains,
      connectors: [
        // Farcaster wallet - first priority when in mini app context
        farcasterWallet(),
        // Injected wallet (MetaMask, etc.)
        injected({
          target: "metaMask",
        }),
        metaMask(),
        // WalletConnect - safe here because we're in a Client Component
        ...(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
          ? [
              walletConnect({
                projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
              }),
            ]
          : []),
        coinbaseWallet({ appName: "Gnars DAO" }),
      ],
      transports: createTransports(),
      ssr: true,
      storage: createSsrStorage(),
    })
  );

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 5 * 60 * 1000, // 5 minutes - reduce unnecessary refetches
            refetchOnWindowFocus: false, // Don't refetch on every tab switch
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
