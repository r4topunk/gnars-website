"use client";

import { useEffect, useState, useMemo } from "react";
import { FuzzyText } from "./FuzzyText";
import { FaultyTerminal } from "./FaultyTerminal";

/**
 * Loading and status indicators for the TV feed
 */
export function TVEmptyState({ loading, error }: { loading: boolean; error: string | null }) {
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // Memoize terminal props to prevent re-renders (must be before early returns)
  const terminalGridMul = useMemo<[number, number]>(() => [2, 1], []);

  // Loading state with phases
  const loadingMessages = useMemo(
    () => [
      "Loading videos...",
      "Finding the best content...",
      "Almost there...",
      "Slow connection - hang tight! 🛹",
    ],
    []
  );

  // Progress through loading phases to give user feedback on slow connections
  useEffect(() => {
    if (!loading) {
      setLoadingPhase(0);
      setShowContent(false);
      return;
    }

    // Show content after terminal background initializes
    const contentTimer = setTimeout(() => setShowContent(true), 100);

    const phases = [
      { delay: 2000, phase: 1 },  // After 2s: "Finding videos..."
      { delay: 5000, phase: 2 },  // After 5s: "Almost there..."
      { delay: 10000, phase: 3 }, // After 10s: "Slow connection detected..."
    ];

    const timers = phases.map(({ delay, phase }) =>
      setTimeout(() => setLoadingPhase(phase), delay)
    );

    return () => {
      clearTimeout(contentTimer);
      timers.forEach(clearTimeout);
    };
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

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center gap-6">
      {/* Faulty terminal background */}
      <div className="absolute inset-0 opacity-20">
        <FaultyTerminal
          scale={1.5}
          gridMul={terminalGridMul}
          digitSize={1.2}
          timeScale={0.5}
          scanlineIntensity={1}
          glitchAmount={1.5}
          flickerAmount={0.8}
          noiseAmp={1}
          chromaticAberration={0}
          dither={0}
          curvature={0}
          tint="#FBBF23"
          mouseReact={false}
          pageLoadAnimation={false}
          brightness={0.6}
        />
      </div>

      {/* Loading content - shows after terminal initializes */}
      {showContent && (
        <>
          {/* Fuzzy "GNARS TV" text */}
          <div className="relative z-10">
            <FuzzyText
              fontSize="48px"
              fontWeight={900}
              color="rgba(251, 191, 35, 0.9)"
              baseIntensity={0.4}
              enableHover={false}
            >
              GNARS TV
            </FuzzyText>
          </div>

          {/* Progress message */}
          <div className="text-center relative z-10">
            <FuzzyText
              fontSize="14px"
              fontWeight={400}
              color="rgba(255, 255, 255, 0.7)"
              baseIntensity={0.3}
              enableHover={false}
            >
              {loadingMessages[loadingPhase]}
            </FuzzyText>
            {loadingPhase >= 3 && (
              <p className="text-white/50 text-xs mt-2">
                Videos will load faster next time
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function TVLoadingMore() {
  return (
    <div className="flex h-24 w-full items-center justify-center text-sm text-white/70">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <FuzzyText
          fontSize="14px"
          fontWeight={400}
          color="rgba(255, 255, 255, 0.7)"
          baseIntensity={0.3}
          enableHover={false}
        >
          Loading more videos...
        </FuzzyText>
      </div>
    </div>
  );
}

export function TVEndOfFeed({ totalVideos }: { totalVideos: number }) {
  return (
    <div className="flex h-24 w-full items-center justify-center text-sm text-white/50">
      <FuzzyText
        fontSize="14px"
        fontWeight={400}
        color="rgba(255, 255, 255, 0.5)"
        baseIntensity={0.25}
        enableHover={false}
      >
        You&apos;ve seen all {totalVideos} videos 🎬
      </FuzzyText>
    </div>
  );
}
