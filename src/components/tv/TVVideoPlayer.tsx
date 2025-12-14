"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getConnectionQuality } from "./useVideoPreloader";

type LoadState = "idle" | "loading" | "canplay" | "playing" | "error" | "waiting";

interface TVVideoPlayerProps {
  src: string;
  poster?: string;
  isActive: boolean;
  isMuted: boolean;
  shouldRender: boolean;
  onEnded?: () => void;
  onLoadedData?: () => void;
  index: number;
}

/**
 * Optimized video player with smooth loading states and preloading.
 * Designed for a premium TikTok-style experience:
 * - Shows poster image as beautiful placeholder while loading
 * - Smooth fade transition from poster to video
 * - Connection-aware loading indicators
 * - Auto-plays when active and ready
 */
export function TVVideoPlayer({
  src,
  poster,
  isActive,
  isMuted,
  shouldRender,
  onEnded,
  onLoadedData,
  index,
}: TVVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasFirstFrame, setHasFirstFrame] = useState(false);
  const mountedRef = useRef(true);
  const connectionQuality = useRef(getConnectionQuality());

  // Track mount state for async operations
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reset state when src changes
  useEffect(() => {
    setLoadState("idle");
    setLoadProgress(0);
    setHasFirstFrame(false);
  }, [src]);

  // Handle video events
  const handleCanPlay = useCallback(() => {
    if (!mountedRef.current) return;
    setLoadState("canplay");
  }, []);

  const handlePlaying = useCallback(() => {
    if (!mountedRef.current) return;
    setLoadState("playing");
    // Mark that we have rendered at least one frame
    // This ensures poster stays visible until video actually shows content
    setHasFirstFrame(true);
  }, []);

  const handleError = useCallback(() => {
    if (!mountedRef.current) return;
    setLoadState("error");
  }, []);

  const handleLoadStart = useCallback(() => {
    if (!mountedRef.current) return;
    setLoadState("loading");
    setLoadProgress(0);
  }, []);

  const handleLoadedData = useCallback(() => {
    if (!mountedRef.current) return;
    onLoadedData?.();
  }, [onLoadedData]);

  // Track buffering/waiting state - show poster again if buffering
  const handleWaiting = useCallback(() => {
    if (!mountedRef.current) return;
    setLoadState("waiting");
    // Don't reset hasFirstFrame - we keep showing video if it was playing
  }, []);

  // Track load progress for slow connections
  const handleProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !mountedRef.current) return;
    
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const duration = video.duration;
      if (duration > 0) {
        setLoadProgress(Math.round((bufferedEnd / duration) * 100));
      }
    }
  }, []);

  // Control playback based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldRender) return;

    if (isActive) {
      // Try to play when active
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay was prevented, user needs to interact
          // This is fine - video will play on user interaction
        });
      }
    } else {
      video.pause();
      video.currentTime = 0;
      // Reset first frame flag when not active
      setHasFirstFrame(false);
      setLoadState("idle");
    }
  }, [isActive, shouldRender]);

  // Update mute state
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }
  }, [isMuted]);

  // If not rendering, show placeholder
  if (!shouldRender) {
    return (
      <div className="absolute inset-0 bg-black">
        {poster && (
          <Image
            src={poster}
            alt=""
            fill
            className="object-contain opacity-40"
            sizes="100vw"
            priority={false}
            unoptimized
          />
        )}
        {/* Subtle gradient overlay for visual consistency */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
      </div>
    );
  }

  // Determine if video should be visible
  // Video is visible when it has rendered at least one frame and is playing/ready
  const showVideo = hasFirstFrame && (loadState === "playing" || loadState === "canplay");

  return (
    <div className="absolute inset-0 bg-black">
      {/* Poster image - ALWAYS rendered, fades when video is playing */}
      {poster && (
        <Image
          src={poster}
          alt=""
          fill
          className={`object-contain transition-opacity duration-300 pointer-events-none ${
            showVideo ? "opacity-0" : "opacity-100"
          }`}
          sizes="100vw"
          priority={isActive}
          unoptimized
        />
      )}

      {/* Loading indicator - adapts to connection quality */}
      {isActive && (loadState === "loading" || loadState === "waiting") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {/* Loading gif */}
          <div className="relative w-16 h-16">
            <Image
              src="/loading.gif"
              alt="Loading"
              width={64}
              height={64}
              className="object-contain"
              unoptimized
            />
          </div>
          
          {/* Progress indicator on slow connections */}
          {connectionQuality.current !== "fast" && loadProgress > 0 && (
            <div className="mt-4 w-32">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/60 transition-all duration-300"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
              <p className="text-white/50 text-xs text-center mt-1">
                {loadState === "waiting" ? "Buffering..." : `${loadProgress}%`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Video element - always mounted but opacity controlled */}
      <video
        ref={videoRef}
        data-index={index}
        src={src}
        poster={poster}
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
          showVideo ? "opacity-100" : "opacity-0"
        }`}
        muted={isMuted}
        playsInline
        loop={false}
        controls={false}
        // Only preload active video fully, others just metadata
        preload={isActive ? "auto" : "metadata"}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onPlaying={handlePlaying}
        onLoadedData={handleLoadedData}
        onWaiting={handleWaiting}
        onProgress={handleProgress}
        onError={handleError}
        onEnded={onEnded}
      />

      {/* Error state - with retry option */}
      {loadState === "error" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
          <div className="text-center text-white/60">
            <p className="text-sm">Unable to load video</p>
            <button
              onClick={() => {
                setLoadState("idle");
                videoRef.current?.load();
              }}
              className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
            >
              Tap to retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
