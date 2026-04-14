"use client";

import { useEffect, useState } from "react";

/**
 * Subscribes to a media query and returns whether it currently matches.
 * SSR-safe: returns false on the server until the first effect runs in
 * the browser.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return matches;
}
