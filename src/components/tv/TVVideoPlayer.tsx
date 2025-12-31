"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePerformanceTracking } from "./useVideoPreloader";

/**
 * Convert IPFS URIs to HTTP gateway URLs
 */
function toHttpUrl(url: string): string {
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://dweb.link/ipfs/");
  }
  return url;
}

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

  // Convert IPFS URLs to HTTP gateway
  const videoSrc = useMemo(() => toHttpUrl(src), [src]);
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasFirstFrame, setHasFirstFrame] = useState(false);
  const mountedRef = useRef(true);
  const loadStartTime = useRef<number>(0);

  // Track performance for adaptive loading
  // Pass the actual load start timestamp (set by handleLoadStart event)
  const { recordLoadSuccess } = usePerformanceTracking(videoSrc, loadStartTime);

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
    loadStartTime.current = 0;
  }, [videoSrc]);

  // Handle video events
  const handleCanPlay = useCallback(() => {
    if (!mountedRef.current) return;
    setLoadState("canplay");
  }, []);

  const handlePlaying = useCallback(() => {
    if (!mountedRef.current) return;
    setLoadState("playing");
    setHasFirstFrame(true);
    recordLoadSuccess();
  }, [recordLoadSuccess]);

  const handleError = useCallback(() => {
    if (!mountedRef.current) return;
    setLoadState("error");
  }, []);

  const handleLoadStart = useCallback(() => {
    if (!mountedRef.current) return;
    loadStartTime.current = performance.now();
    setLoadState("loading");
    setLoadProgress(0);
  }, []);

  const handleLoadedData = useCallback(() => {
    if (!mountedRef.current) return;
    onLoadedData?.();
  }, [onLoadedData]);

  // Track buffering/waiting state
  const handleWaiting = useCallback(() => {
    if (!mountedRef.current) return;
    setLoadState("waiting");
    // Don't reset hasFirstFrame - keep video visible even when buffering
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

    // Ensure autoplay preconditions are set before attempting to play.
    // On iOS/Safari, missing muted/playsinline at the moment of play() can cause
    // the first autoplay attempt to be rejected until a user gesture occurs.
    video.muted = isMuted;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

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
  }, [isActive, shouldRender, isMuted]);

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
  // Once video has shown first frame, keep it visible even during buffering
  // Only hide on error or when video hasn't started yet
  const showVideo = hasFirstFrame && loadState !== "error";

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
          unoptimized
        />
      )}

      {/* Loading indicator - only show if no poster available */}
      {isActive && !poster && (loadState === "loading" || loadState === "waiting") && (
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
          
          {/* Progress indicator (only when we have progress) */}
          {loadProgress > 0 && (
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
        src={videoSrc}
        poster={poster}
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
          showVideo ? "opacity-100" : "opacity-0"
        }`}
        muted={isMuted}
        playsInline
        autoPlay={isActive}
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
