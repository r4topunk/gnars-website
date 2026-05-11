"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ViewMode = "sa" | "eoa";

const STORAGE_KEY = "gnars:view-as";

interface ViewAccountContextValue {
  /**
   * The user's explicit choice, or `null` if they haven't chosen yet. When
   * null, `useUserAddress` falls back to a wallet-shape-aware default
   * ("eoa" for external wallets, "sa" for inAppWallet / pure EOA).
   */
  viewMode: ViewMode | null;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: (currentEffective: ViewMode) => void;
  /** Reset to the wallet-aware default. Call on disconnect. */
  clearViewMode: () => void;
}

const ViewAccountContext = createContext<ViewAccountContextValue | null>(null);

/**
 * Client-side toggle that controls whether the app displays and queries
 * state as the smart account or the underlying admin EOA.
 *
 * The stored value is nullable: a fresh user has no choice yet, which
 * lets `useUserAddress` apply a wallet-aware default (external-wallet
 * users see their EOA by default, inAppWallet / pure-EOA users see the
 * active account). Once the user explicitly toggles, we persist their
 * choice to localStorage so subsequent reloads honor it.
 *
 * Writes are unaffected — they always flow through thirdweb's active
 * account (the SA). This only changes which address is fed to read hooks
 * via `useUserAddress()`.
 */
export function ViewAccountProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "eoa" || stored === "sa") {
        setViewModeState(stored);
      }
    } catch {
      // localStorage unavailable — stick with default
    }
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, []);

  const toggleViewMode = useCallback((currentEffective: ViewMode) => {
    const next: ViewMode = currentEffective === "sa" ? "eoa" : "sa";
    setViewModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const clearViewMode = useCallback(() => {
    setViewModeState(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<ViewAccountContextValue>(
    () => ({ viewMode, setViewMode, toggleViewMode, clearViewMode }),
    [viewMode, setViewMode, toggleViewMode, clearViewMode],
  );

  return <ViewAccountContext.Provider value={value}>{children}</ViewAccountContext.Provider>;
}

export function useViewAccount(): ViewAccountContextValue {
  const ctx = useContext(ViewAccountContext);
  if (!ctx) {
    // Safe default when the provider is absent (e.g. unit tests).
    return {
      viewMode: null,
      setViewMode: () => {},
      toggleViewMode: () => {},
      clearViewMode: () => {},
    };
  }
  return ctx;
}
