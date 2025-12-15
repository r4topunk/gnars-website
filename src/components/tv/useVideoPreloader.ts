"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { TVItem } from "./types";

/**
 * Performance tier based on actual measured video load times
 * This is MORE reliable than Network Information API (not available on Safari/iOS)
 */
type PerformanceTier = "conservative" | "balanced" | "aggressive";

/**
 * Performance metrics tracker
 * Learns from actual video load times to adapt preloading strategy
 */
class PerformanceTracker {
  private loadTimes: number[] = [];
  private readonly MAX_SAMPLES = 10;
  private readonly SLOW_THRESHOLD = 3000; // 3s
  private readonly FAST_THRESHOLD = 1000; // 1s

  recordLoadTime(ms: number) {
    this.loadTimes.push(ms);
    if (this.loadTimes.length > this.MAX_SAMPLES) {
      this.loadTimes.shift();
    }
  }

  getAverageLoadTime(): number {
    if (this.loadTimes.length === 0) return 0;
    return this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length;
  }

  getTier(): PerformanceTier {
    // Start conservative until we have data
    if (this.loadTimes.length < 3) return "conservative";

    const avg = this.getAverageLoadTime();
    
    // Check data saver mode (available on most browsers)
    if (typeof navigator !== "undefined") {
      const nav = navigator as Navigator & { 
        connection?: { saveData?: boolean } 
      };
      if (nav.connection?.saveData) return "conservative";
    }

    if (avg > this.SLOW_THRESHOLD) return "conservative";
    if (avg < this.FAST_THRESHOLD) return "aggressive";
    return "balanced";
  }

  getMetrics() {
    return {
      samples: this.loadTimes.length,
      average: Math.round(this.getAverageLoadTime()),
      tier: this.getTier(),
    };
  }
}

// Global singleton tracker
const performanceTracker = new PerformanceTracker();

interface PreloaderConfig {
  /** Number of videos ahead to preload */
  preloadAhead: number;
  /** Number of videos behind to keep preloaded */
  preloadBehind: number;
}

/**
 * Conservative defaults optimized for real-world performance
 * Based on TikTok/Instagram Reels patterns:
 * - Always preload next video (seamless swipe up)
 * - Keep previous video ready (seamless swipe down)
 * - Don't waste bandwidth on videos user might never see
 */
const PRELOADER_CONFIG: Record<PerformanceTier, PreloaderConfig> = {
  aggressive: { preloadAhead: 2, preloadBehind: 1 },
  balanced: { preloadAhead: 1, preloadBehind: 1 },
  conservative: { preloadAhead: 1, preloadBehind: 0 },
};

/**
 * Hook to track video load performance and adapt strategy
 * 
 * Measures the REAL load time: from loadstart event to playing event
 * This gives us actual user-perceived performance metrics
 */
export function usePerformanceTracking(
  videoUrl: string | undefined,
  loadStartTimeRef: MutableRefObject<number>,
) {
  const hasRecordedRef = useRef(false);

  // Reset tracking when URL changes
  useEffect(() => {
    hasRecordedRef.current = false;
  }, [videoUrl]);

  const recordLoadSuccess = () => {
    // Only record once per video load
    if (hasRecordedRef.current || loadStartTimeRef.current === 0) return;
    
    // Calculate actual load time: from loadstart to playing
    const loadTime = performance.now() - loadStartTimeRef.current;
    performanceTracker.recordLoadTime(loadTime);
    hasRecordedRef.current = true;
  };

  return { recordLoadSuccess };
}

/**
 * Hook to intelligently preload videos near the active index.
 * Uses <link rel="preload"> for efficient browser-level preloading.
 * 
 * Performance-first approach:
 * - Learns from actual load times (not unreliable Network API)
 * - Defaults to 2 videos: 1 ahead + 1 behind (TikTok pattern)
 * - Adapts based on real-world performance
 * - Minimal bandwidth waste on slow connections
 */
export function useVideoPreloader(
  items: TVItem[],
  activeIndex: number,
  enabled = true
) {
  const preloadedUrlsRef = useRef<Map<string, HTMLLinkElement>>(new Map());
  const [tier, setTier] = useState<PerformanceTier>(() => performanceTracker.getTier());

  // Update tier periodically based on learned performance
  useEffect(() => {
    const interval = setInterval(() => {
      const newTier = performanceTracker.getTier();
      if (newTier !== tier) {
        setTier(newTier);
      }
    }, 5000); // Check every 5s

    return () => clearInterval(interval);
  }, [tier]);

  // Cleanup ONLY on unmount
  useEffect(() => {
    const preloadedUrls = preloadedUrlsRef.current;
    return () => {
      preloadedUrls.forEach((link) => link.remove());
      preloadedUrls.clear();
    };
  }, []);

  // Preload videos near the active index
  useEffect(() => {
    if (!enabled || items.length === 0) return;

    const config = PRELOADER_CONFIG[tier];
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
      } catch {
        // If preload fails, just skip it - video will load when played
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
        } catch {
          // Silently handle removal failures
          preloadedUrls.delete(url);
        }
      }
    });

  }, [items, activeIndex, enabled, tier]);
}

/**
 * Buffer distance calculation for virtualization.
 * Conservative default: only render 2 videos total (current + 1 ahead)
 * This is optimal for:
 * - Memory efficiency
 * - Smooth scroll performance  
 * - Works great on mobile
 */
export function useRenderBuffer(): number {
  const tier = performanceTracker.getTier();
  // Always keep render buffer tight - only mount what's visible/next
  switch (tier) {
    case "aggressive": return 2; // Current + 2 ahead/behind
    case "balanced": return 1;   // Current + 1 ahead/behind (default)
    case "conservative": return 1; // Minimal
  }
}


