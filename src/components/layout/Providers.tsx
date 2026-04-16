"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, type Config } from "wagmi";
import { ThirdwebProvider } from "thirdweb/react";
import { getWagmiConfig } from "@/lib/wagmi";
import { ThirdwebBootstrap } from "@/components/layout/ThirdwebBootstrap";
import { ViewAccountProvider } from "@/components/layout/ViewAccountContext";

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
 * Providers component that wraps the app with wagmi (reads), react-query,
 * and thirdweb (login + writes). `ThirdwebBootstrap` restores the active
 * session on page load via `useAutoConnect` and, when applicable, wires up
 * the Farcaster mini-app wallet adapter.
 */
export default function Providers({ children }: { children: ReactNode }) {
  const config = getConfig();
  const client = getQueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <ThirdwebProvider>
          <ThirdwebBootstrap />
          <ViewAccountProvider>{children}</ViewAccountProvider>
        </ThirdwebProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
