"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Loading and status indicators for the TV feed
 */
export function TVEmptyState({ loading, error }: { loading: boolean; error: string | null }) {
  const [loadingPhase, setLoadingPhase] = useState(0);

  // Progress through loading phases to give user feedback on slow connections
  useEffect(() => {
    if (!loading) {
      setLoadingPhase(0);
      return;
    }

    const phases = [
      { delay: 2000, phase: 1 },  // After 2s: "Finding videos..."
      { delay: 5000, phase: 2 },  // After 5s: "Almost there..."
      { delay: 10000, phase: 3 }, // After 10s: "Slow connection detected..."
    ];

    const timers = phases.map(({ delay, phase }) =>
      setTimeout(() => setLoadingPhase(phase), delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [loading]);

  if (!loading && !error) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-sm text-white/70">
        No videos available
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <p className="text-white/70 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Loading state with phases
  const loadingMessages = [
    "Loading videos...",
    "Finding the best content...",
    "Almost there...",
    "Slow connection - hang tight! 🛹",
  ];

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6">
      {/* Animated Gnars loading gif */}
      <div className="relative w-24 h-24">
        <Image
          src="/loading.gif"
          alt="Loading"
          width={96}
          height={96}
          className="object-contain"
          unoptimized
          priority
        />
      </div>

      {/* Progress message */}
      <div className="text-center">
        <p className="text-white/70 text-sm animate-pulse">
          {loadingMessages[loadingPhase]}
        </p>
        {loadingPhase >= 3 && (
          <p className="text-white/50 text-xs mt-2">
            Videos will load faster next time
          </p>
        )}
      </div>
    </div>
  );
}

export function TVLoadingMore() {
  return (
    <div className="flex h-24 w-full items-center justify-center text-sm text-white/70">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <span>Loading more videos...</span>
      </div>
    </div>
  );
}

export function TVEndOfFeed({ totalVideos }: { totalVideos: number }) {
  return (
    <div className="flex h-24 w-full items-center justify-center text-sm text-white/50">
      You&apos;ve seen all {totalVideos} videos 🎬
    </div>
  );
}
