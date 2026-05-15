"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { ExternalLink } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useTVFeed } from "./useTVFeed";

const Gnar3DTVScene = dynamic(() => import("./Gnar3DTVScene").then((mod) => mod.Gnar3DTVScene), {
  ssr: false,
  loading: () => null, // No loading indicator
});

interface Gnar3DTVProps {
  autoRotate?: boolean;
  className?: string;
}

// Pointer movement above this many pixels between down/up is treated as a
// drag (rotate) instead of a click (navigate).
const DRAG_THRESHOLD_PX = 6;

export function Gnar3DTV({ autoRotate = true, className = "" }: Gnar3DTVProps) {
  const t = useTranslations("tv");
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  // Fetch TV feed data
  const { items, creatorCoinImages } = useTVFeed({});

  // 3D TV only supports video (renders on texture)
  const videoItems = useMemo(() => items.filter((i) => i.videoUrl), [items]);

  // Current video
  const currentVideo = videoItems[currentIndex];

  // Trigger fade-in animation after mount
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Prefetch /tv so navigation feels instant
  useEffect(() => {
    router.prefetch("/tv");
  }, [router]);

  // Handle auto-advance to next video
  const handleNextVideo = useCallback(() => {
    if (videoItems.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % videoItems.length);
  }, [videoItems.length]);

  const navigateToTV = useCallback(() => {
    router.push("/tv");
  }, [router]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = pointerStartRef.current;
      pointerStartRef.current = null;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      // Treat as click only when pointer barely moved — drags are reserved for OrbitControls rotation.
      if (Math.hypot(dx, dy) <= DRAG_THRESHOLD_PX) {
        navigateToTV();
      }
    },
    [navigateToTV],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigateToTV();
      }
    },
    [navigateToTV],
  );

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={t("gnar3dTV.ariaLabel")}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={`group relative w-full cursor-pointer transition-all duration-700 ease-out active:cursor-grabbing ${className} ${
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

      {/* Affordance: corner icon hints that the TV is clickable. Decorative only — wrapper handles navigation. */}
      <div
        className="pointer-events-none absolute right-3 top-3 z-10 rounded-lg bg-black/60 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden="true"
      >
        <ExternalLink className="h-5 w-5" />
      </div>
    </div>
  );
}
