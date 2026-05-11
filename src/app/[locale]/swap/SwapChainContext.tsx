"use client";

import * as React from "react";
import { DEFAULT_SWAP_CHAIN, getSwapChain, type SwapChain } from "./chains";

interface SwapChainContextValue {
  chain: SwapChain;
  setChainId: (id: number) => void;
}

const SwapChainContext = React.createContext<SwapChainContextValue | null>(null);

/**
 * Holds the chain currently selected in the swap UI. ChainSelector writes
 * to it; SwapWidget reads from it. The wallet's *active* chain is separate
 * (driven by thirdweb) — wrong-network UI compares the two.
 */
export function SwapChainProvider({ children }: { children: React.ReactNode }) {
  const [chainId, setChainId] = React.useState<number>(DEFAULT_SWAP_CHAIN.id);
  const chain = React.useMemo(() => getSwapChain(chainId), [chainId]);
  const value = React.useMemo<SwapChainContextValue>(() => ({ chain, setChainId }), [chain]);
  return <SwapChainContext.Provider value={value}>{children}</SwapChainContext.Provider>;
}

export function useSwapChain(): SwapChainContextValue {
  const ctx = React.useContext(SwapChainContext);
  if (!ctx) throw new Error("useSwapChain must be used inside <SwapChainProvider>");
  return ctx;
}
