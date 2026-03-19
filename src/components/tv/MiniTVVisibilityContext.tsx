"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface MiniTVVisibilityContextValue {
  // true = hero TV is in viewport → mini TV should be hidden
  // false = hero TV not visible (or non-homepage) → mini TV shows
  heroTVVisible: boolean;
  setHeroTVVisible: (visible: boolean) => void;
}

const MiniTVVisibilityContext = createContext<MiniTVVisibilityContextValue>({
  heroTVVisible: false,
  setHeroTVVisible: () => {},
});

export function MiniTVVisibilityProvider({ children }: { children: ReactNode }) {
  const [heroTVVisible, setHeroTVVisible] = useState(false);

  return (
    <MiniTVVisibilityContext.Provider value={{ heroTVVisible, setHeroTVVisible }}>
      {children}
    </MiniTVVisibilityContext.Provider>
  );
}

export function useMiniTVVisibility() {
  return useContext(MiniTVVisibilityContext);
}
