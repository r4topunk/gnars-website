"use client";

import { type ReactNode } from "react";
import { useThirdwebWallet } from "@/hooks/use-thirdweb-wallet";

/**
 * Mounts the wagmi -> thirdweb bridge effect at the app root so that
 * every page sees the same bridged thirdweb account. Renders children
 * untouched. The bridge hook only runs once because this component is
 * mounted in Providers.tsx, directly inside ThirdwebProvider.
 */
export function ThirdwebWagmiBridge({ children }: { children: ReactNode }) {
  useThirdwebWallet();
  return <>{children}</>;
}
