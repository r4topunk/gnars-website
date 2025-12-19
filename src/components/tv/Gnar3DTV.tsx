"use client";

import { useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTVFeed } from "./useTVFeed";

const Gnar3DTVScene = dynamic(() => import("./Gnar3DTVScene").then((mod) => mod.Gnar3DTVScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl bg-muted">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading TV...</span>
      </div>
    </div>
  ),
});

interface Gnar3DTVProps {
  autoRotate?: boolean;
  className?: string;
  playDuration?: number;
}

export function Gnar3DTV({ autoRotate = true, className = "", playDuration = 5 }: Gnar3DTVProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch TV feed data
  const { items } = useTVFeed({});

  // Filter to only video items
  const videoItems = useMemo(() => items.filter((i) => i.videoUrl), [items]);

  // Current video
  const currentVideo = videoItems[currentIndex];

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
    <div className={`w-full cursor-pointer ${className}`} onClick={handleTVClick}>
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
