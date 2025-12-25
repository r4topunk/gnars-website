"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { X, Maximize2 } from "lucide-react";
import { useTVFeed } from "./useTVFeed";

const Gnar3DTVScene = dynamic(() => import("./Gnar3DTVScene").then((mod) => mod.Gnar3DTVScene), {
  ssr: false,
  loading: () => null, // No loading indicator
});

interface Gnar3DTVProps {
  autoRotate?: boolean;
  className?: string;
}

export function Gnar3DTV({ autoRotate = true, className = "" }: Gnar3DTVProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch TV feed data
  const { items, creatorCoinImages } = useTVFeed({});

  // Filter to only video items
  const videoItems = useMemo(() => items.filter((i) => i.videoUrl), [items]);

  // Current video
  const currentVideo = videoItems[currentIndex];

  // Trigger fade-in animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when fullscreen
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  // Handle auto-advance to next video
  const handleNextVideo = useCallback(() => {
    if (videoItems.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % videoItems.length);
  }, [videoItems.length]);

  // Handle click - toggle fullscreen
  const handleTVClick = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  // Handle close fullscreen
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullscreen(false);
  }, []);

  // Fullscreen overlay
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-300 pt-16"
        onClick={handleClose}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-20 z-50 rounded-lg bg-black/60 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
          aria-label="Close fullscreen"
        >
          <X className="h-6 w-6" />
        </button>

        {/* TV container - full viewport */}
        <div
          className="h-full w-full max-h-screen max-w-screen cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <Gnar3DTVScene
            videoUrl={currentVideo?.videoUrl}
            autoRotate={true}
            onNextVideo={handleNextVideo}
            creatorCoinImages={creatorCoinImages}
            cameraPosition={[0, 1, 3]}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative w-full cursor-grab transition-all duration-700 ease-out active:cursor-grabbing ${className} ${
        isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      <div className="aspect-square overflow-hidden">
        <Gnar3DTVScene
          videoUrl={currentVideo?.videoUrl}
          autoRotate={autoRotate}
          onNextVideo={handleNextVideo}
          creatorCoinImages={creatorCoinImages}
        />
      </div>

      {/* Fullscreen button - appears on hover */}
      <button
        onClick={handleTVClick}
        className="absolute right-3 top-3 z-10 rounded-lg bg-black/60 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-black/80 group-hover:opacity-100"
        aria-label="Enter fullscreen"
      >
        <Maximize2 className="h-5 w-5" />
      </button>
    </div>
  );
}
