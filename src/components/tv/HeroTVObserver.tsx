"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useMiniTVVisibility } from "./MiniTVVisibilityContext";

export function HeroTVObserver({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { setHeroTVVisible } = useMiniTVVisibility();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setHeroTVVisible(entries[0]?.isIntersecting ?? false);
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      // Reset on unmount (navigating away from homepage)
      setHeroTVVisible(false);
    };
  }, [setHeroTVVisible]);

  return <div ref={ref}>{children}</div>;
}
