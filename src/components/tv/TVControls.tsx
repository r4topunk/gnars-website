"use client";

import { Maximize, Minimize, Share2, Volume2, VolumeX } from "lucide-react";
import { TVInfiniteMenu } from "./TVInfiniteMenu";
import type { TVItem } from "./types";

interface TVControlsProps {
  isMuted: boolean;
  isPaused: boolean;
  isFullscreen: boolean;
  showControls: boolean;
  onToggleMute: () => void;
  onTogglePlayPause: () => void;
  onToggleFullscreen: () => void;
  onShare: () => void;
  // Menu props
  videoItems?: TVItem[];
  currentIndex?: number;
  onMenuItemClick?: (index: number) => void;
}

/**
 * Side controls for the TV player (fullscreen, play/pause, mute, share, menu)
 */
export function TVControls({
  isMuted,
  isPaused,
  isFullscreen,
  showControls,
  onToggleMute,
  onTogglePlayPause,
  onToggleFullscreen,
  onShare,
  videoItems = [],
  currentIndex = 0,
  onMenuItemClick,
}: TVControlsProps) {
  return (
    <div 
      className={`absolute top-24 right-5 flex flex-col gap-3 z-30 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!showControls}
    >
      <ControlButton
        onClick={onToggleFullscreen}
        ariaLabel={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
      </ControlButton>

      <ControlButton onClick={onTogglePlayPause} ariaLabel={isPaused ? "Play" : "Pause"}>
        {isPaused ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        )}
      </ControlButton>

      <ControlButton onClick={onToggleMute} ariaLabel={isMuted ? "Unmute" : "Mute"}>
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </ControlButton>

      <ControlButton onClick={onShare} ariaLabel="Share">
        <Share2 className="w-4 h-4" />
      </ControlButton>

      {/* Menu Button - Integrated with TVInfiniteMenu */}
      {videoItems.length > 0 && onMenuItemClick && (
        <TVInfiniteMenu
          items={videoItems}
          currentIndex={currentIndex}
          onItemClick={onMenuItemClick}
        />
      )}
    </div>
  );
}

interface ControlButtonProps {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}

function ControlButton({ onClick, ariaLabel, children }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      className="pointer-events-auto w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 hover:scale-105 active:scale-95 transition-all"
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
