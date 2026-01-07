"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, type Config } from "wagmi";
import { getWagmiConfig } from "@/lib/wagmi";

// Create singleton instances outside component to prevent re-creation
// This avoids duplicate provider warnings in development mode
let wagmiConfig: Config | undefined;
let queryClient: QueryClient | undefined;

function getConfig() {
  if (!wagmiConfig) {
    wagmiConfig = getWagmiConfig();
  }
  return wagmiConfig;
}

function getQueryClient() {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return queryClient;
}

/**
 * Providers component that wraps the app with wagmi and react-query.
 * Uses module-level singletons to prevent duplicate instances.
 */
export default function Providers({ children }: { children: ReactNode }) {
  const config = getConfig();
  const client = getQueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
