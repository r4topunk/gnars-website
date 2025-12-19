"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTVFeed } from "./useTVFeed";

const Gnar3DTVScene = dynamic(() => import("./Gnar3DTVScene").then((mod) => mod.Gnar3DTVScene), {
  ssr: false,
  loading: () => null, // No loading indicator
});

interface Gnar3DTVProps {
  autoRotate?: boolean;
  className?: string;
  playDuration?: number;
}

export function Gnar3DTV({ autoRotate = true, className = "", playDuration = 5 }: Gnar3DTVProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

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

  // Handle auto-advance to next video
  const handleNextVideo = useCallback(() => {
    if (videoItems.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % videoItems.length);
  }, [videoItems.length]);

  // Handle click - navigate to /tv
  const handleTVClick = useCallback(() => {
    router.push("/tv");
  }, [router]);

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
          playDuration={playDuration}
        />
      </div>
    </div>
  );
}
