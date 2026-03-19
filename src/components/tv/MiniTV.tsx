"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { useTVFeed } from "./useTVFeed";
import { useMiniTVVisibility } from "./MiniTVVisibilityContext";

const Gnar3DTVScene = dynamic(
  () => import("./Gnar3DTVScene").then((mod) => mod.Gnar3DTVScene),
  { ssr: false, loading: () => null }
);

export function MiniTV() {
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { heroTVVisible } = useMiniTVVisibility();

  // Feed is fetched on mount, but videoUrl only passed on hover
  const { items, creatorCoinImages } = useTVFeed({});
  const videoItems = useMemo(() => items.filter((i) => i.videoUrl), [items]);
  const currentVideo = videoItems[currentIndex];

  // Fade-in after mount
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // ESC to close fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const handleNextVideo = useCallback(() => {
    if (videoItems.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % videoItems.length);
  }, [videoItems.length]);

  const handleClick = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullscreen(false);
  }, []);

  // Determine video URL: only pass when hovered or fullscreen
  const videoUrl = isHovered || isFullscreen ? currentVideo?.videoUrl : undefined;

  // Fullscreen overlay
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-300 pt-16"
        onClick={handleClose}
      >
        <button
          onClick={handleClose}
          className="absolute right-4 top-20 z-[60] rounded-lg bg-black/60 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
          aria-label="Close fullscreen"
        >
          <X className="h-6 w-6" />
        </button>
        <div
          className="h-full w-full max-h-screen max-w-screen cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <Gnar3DTVScene
            videoUrl={videoUrl}
            autoRotate={true}
            onNextVideo={handleNextVideo}
            creatorCoinImages={creatorCoinImages}
            dpr={0.6}
            enableOrbitControls={true}
          />
        </div>
      </div>
    );
  }

  // Mini TV — hidden when hero TV is visible
  return (
    <div
      className={`fixed bottom-4 left-4 z-40 h-[120px] w-[120px] cursor-pointer transition-all duration-500 ease-out ${
        isLoaded && !heroTVVisible
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-75 translate-y-4 pointer-events-none"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="h-full w-full overflow-hidden rounded-lg shadow-lg ring-1 ring-white/10">
        <Gnar3DTVScene
          videoUrl={videoUrl}
          autoRotate={true}
          onNextVideo={handleNextVideo}
          creatorCoinImages={creatorCoinImages}
          dpr={0.4}
          enableOrbitControls={false}
        />
      </div>
    </div>
  );
}
