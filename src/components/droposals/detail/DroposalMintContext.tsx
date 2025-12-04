/**
 * DroposalMintContext
 * Provides shared state between ActionBox and Supporters for auto-refresh.
 */
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface DroposalMintContextValue {
  refreshKey: number;
  triggerRefresh: () => void;
}

const DroposalMintContext = createContext<DroposalMintContextValue | null>(null);

export function DroposalMintProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <DroposalMintContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </DroposalMintContext.Provider>
  );
}

export function useDroposalMint() {
  const context = useContext(DroposalMintContext);
  if (!context) {
    // Return default values if used outside provider
    return { refreshKey: 0, triggerRefresh: () => {} };
  }
  return context;
}
