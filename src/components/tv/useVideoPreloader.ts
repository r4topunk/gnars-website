"use client";

import { useEffect, useRef } from "react";
import type { TVItem } from "./types";

// Connection quality detection
type ConnectionQuality = "slow" | "medium" | "fast";

type NetworkInfo = {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
  rtt?: number; // Round-trip time in ms
};

/**
 * Detect connection quality using Network Information API
 * Falls back to "fast" if API unavailable
 * 
 * Note: Network Information API is not supported on:
 * - Safari (iOS/macOS)
 * - Older Firefox versions
 * - Internet Explorer
 */
export function getConnectionQuality(): ConnectionQuality {
  // SSR check
  if (typeof navigator === "undefined") return "fast";

  const nav = navigator as Navigator & { connection?: NetworkInfo };

  // If API not available (Safari, older browsers), assume fast
  // This is safer than assuming slow since the video element itself
  // has connection-aware loading built in
  if (!nav.connection) return "fast";

  try {
    // Respect data saver mode - always slow
    if (nav.connection.saveData) return "slow";

    const effectiveType = nav.connection.effectiveType;
    const downlink = nav.connection.downlink;
    const rtt = nav.connection.rtt;

    // 2G or slow-2g is definitely slow
    if (effectiveType && ["slow-2g", "2g"].includes(effectiveType)) {
      return "slow";
    }

    // 3G is medium - we can do some preloading but be conservative
    if (effectiveType === "3g") {
      return "medium";
    }

    // Check actual metrics for more accuracy
    if (downlink !== undefined) {
      if (downlink < 0.5) return "slow";    // < 500 Kbps
      if (downlink < 2) return "medium";   // < 2 Mbps
    }

    // High latency is also a problem
    if (rtt !== undefined && rtt > 500) {
      return "medium";
    }
  } catch (err) {
    // If any error occurs reading connection properties, fallback to fast
    console.warn("[preloader] Failed to detect connection quality:", err);
    return "fast";
  }

  return "fast";
}

interface PreloaderConfig {
  /** Number of videos ahead to preload */
  preloadAhead: number;
  /** Number of videos behind to keep preloaded */
  preloadBehind: number;
  /** Use low-priority fetch */
  lowPriority: boolean;
}

const PRELOADER_CONFIG: Record<ConnectionQuality, PreloaderConfig> = {
  fast: { preloadAhead: 3, preloadBehind: 1, lowPriority: false },
  medium: { preloadAhead: 2, preloadBehind: 0, lowPriority: true },
  slow: { preloadAhead: 1, preloadBehind: 0, lowPriority: true },
};

/**
 * Hook to intelligently preload videos near the active index.
 * Uses <link rel="preload"> for efficient browser-level preloading.
 * 
 * Features:
 * - Connection-aware: preloads fewer videos on slow connections
 * - Deduplicates: tracks what's already preloaded
 * - Cleanup: removes old preload links to avoid memory bloat
 * - Priority: preloads in order of proximity to active video
 */
export function useVideoPreloader(
  items: TVItem[],
  activeIndex: number,
  enabled = true
) {
  const preloadedUrlsRef = useRef<Map<string, HTMLLinkElement>>(new Map());
  const connectionQualityRef = useRef<ConnectionQuality>(getConnectionQuality());

  // Update connection quality periodically
  useEffect(() => {
    const updateConnection = () => {
      connectionQualityRef.current = getConnectionQuality();
    };

    // Listen for connection changes (Chrome, Edge, some Android browsers)
    // Not supported on Safari or Firefox
    try {
      const nav = navigator as Navigator & {
        connection?: EventTarget & { 
          addEventListener?: (type: string, listener: () => void) => void;
          removeEventListener?: (type: string, listener: () => void) => void;
        };
      };

      if (nav.connection && typeof nav.connection.addEventListener === "function") {
        nav.connection.addEventListener("change", updateConnection);
        return () => {
          if (nav.connection && typeof nav.connection.removeEventListener === "function") {
            nav.connection.removeEventListener("change", updateConnection);
          }
        };
      }
    } catch (err) {
      // Silently fail - connection listener is optional enhancement
      console.warn("[preloader] Connection change listener failed:", err);
    }
  }, []);

  // Preload videos near the active index
  useEffect(() => {
    if (!enabled || items.length === 0) return;

    const quality = connectionQualityRef.current;
    const config = PRELOADER_CONFIG[quality];
    const preloadedUrls = preloadedUrlsRef.current;

    // Calculate which indices to preload
    const indicesToPreload: number[] = [];
    
    // Add videos ahead (priority)
    for (let i = 1; i <= config.preloadAhead; i++) {
      const idx = activeIndex + i;
      if (idx < items.length) {
        indicesToPreload.push(idx);
      }
    }

    // Add videos behind
    for (let i = 1; i <= config.preloadBehind; i++) {
      const idx = activeIndex - i;
      if (idx >= 0) {
        indicesToPreload.push(idx);
      }
    }

    // Get URLs to preload
    const urlsToPreload = indicesToPreload
      .map((idx) => items[idx]?.videoUrl)
      .filter((url): url is string => !!url && !preloadedUrls.has(url));

    // Create preload links
    urlsToPreload.forEach((url) => {
      try {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "video";
        link.href = url;
        // Don't block rendering
        link.setAttribute("fetchpriority", "low");
        
        // Ensure document.head exists (defensive check)
        if (document.head) {
          document.head.appendChild(link);
          preloadedUrls.set(url, link);
        }
      } catch (err) {
        // If preload fails, just skip it - video will load when played
        console.warn(`[preloader] Failed to preload video: ${url}`, err);
      }
    });

    // Cleanup old preloads (keep only nearby videos)
    const activeUrl = items[activeIndex]?.videoUrl;
    const nearbyUrls = new Set([
      activeUrl,
      ...indicesToPreload.map((idx) => items[idx]?.videoUrl),
    ].filter(Boolean));

    preloadedUrls.forEach((link, url) => {
      if (!nearbyUrls.has(url)) {
        try {
          link.remove();
          preloadedUrls.delete(url);
        } catch (err) {
          // Silently handle removal failures
          console.warn(`[preloader] Failed to remove preload link: ${url}`, err);
          preloadedUrls.delete(url);
        }
      }
    });

    // Cleanup on unmount
    return () => {
      try {
        preloadedUrls.forEach((link) => link.remove());
        preloadedUrls.clear();
      } catch (err) {
        console.warn("[preloader] Cleanup failed:", err);
      }
    };
  }, [items, activeIndex, enabled]);
}

/**
 * Buffer distance calculation for virtualization.
 * Determines how many videos to render based on connection quality.
 */
export function useRenderBuffer(): number {
  const quality = getConnectionQuality();
  // Render more videos on fast connections for smoother scrolling
  switch (quality) {
    case "fast": return 2;
    case "medium": return 2;  // Keep 2 for smooth scroll, but preload less
    case "slow": return 1;    // Minimal rendering on slow connections
  }
}

/**
 * Hook to check if a video index should be rendered.
 * Implements virtualization - only renders nearby videos.
 */
export function useShouldRenderVideo(
  index: number,
  activeIndex: number,
  bufferSize = 2
): boolean {
  return Math.abs(index - activeIndex) <= bufferSize;
}

/**
 * Hook to get optimized preload strategy for a video.
 * Returns the appropriate preload attribute value based on connection.
 */
export function useVideoPreloadStrategy(
  index: number,
  activeIndex: number
): "auto" | "metadata" | "none" {
  const distance = Math.abs(index - activeIndex);
  const quality = getConnectionQuality();

  if (distance === 0) return "auto"; // Active video - load fully

  // On slow connections, only load active video fully
  if (quality === "slow") {
    return distance === 1 ? "metadata" : "none";
  }

  // On medium/fast, preload adjacent videos
  if (distance <= 1) return "metadata";
  return "none";
}
