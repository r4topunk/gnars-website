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
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

const ViewAccountContext = createContext<ViewAccountContextValue | null>(null);

/**
 * Client-side toggle that controls whether the app displays and queries
 * state as the smart account (default) or the underlying admin EOA.
 *
 * Writes are unaffected — they always flow through thirdweb's active
 * account (the SA). This only changes which address is fed to read hooks
 * via `useUserAddress()`, so the user can "view the app as their EOA"
 * without disconnecting.
 *
 * Persisted to localStorage so the mode survives reloads.
 */
export function ViewAccountProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>("sa");

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

  const toggleViewMode = useCallback(() => {
    setViewModeState((prev) => {
      const next = prev === "sa" ? "eoa" : "sa";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = useMemo<ViewAccountContextValue>(
    () => ({ viewMode, setViewMode, toggleViewMode }),
    [viewMode, setViewMode, toggleViewMode],
  );

  return (
    <ViewAccountContext.Provider value={value}>
      {children}
    </ViewAccountContext.Provider>
  );
}

export function useViewAccount(): ViewAccountContextValue {
  const ctx = useContext(ViewAccountContext);
  if (!ctx) {
    // Safe default when the provider is absent (e.g. unit tests).
    return {
      viewMode: "sa",
      setViewMode: () => {},
      toggleViewMode: () => {},
    };
  }
  return ctx;
}
