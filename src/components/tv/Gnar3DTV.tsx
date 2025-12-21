"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
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
  const { items } = useTVFeed({});

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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300 pt-16"
        onClick={handleClose}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          aria-label="Close fullscreen"
        >
          <X className="h-6 w-6" />
        </button>

        {/* TV container - full viewport */}
        <div
          className="h-full w-full max-h-screen max-w-screen"
          onClick={(e) => e.stopPropagation()}
        >
          <Gnar3DTVScene
            videoUrl={currentVideo?.videoUrl}
            autoRotate={false}
            onNextVideo={handleNextVideo}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full cursor-pointer transition-all duration-700 ease-out ${className} ${
        isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      onClick={handleTVClick}
    >
      <div className="aspect-square overflow-hidden">
        <Gnar3DTVScene
          videoUrl={currentVideo?.videoUrl}
          autoRotate={autoRotate}
          onNextVideo={handleNextVideo}
        />
      </div>
    </div>
  );
}
