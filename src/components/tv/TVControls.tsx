"use client";

import { useState } from "react";
import { Maximize, Minimize, Share2, Volume2, VolumeX } from "lucide-react";
import { TVInfiniteMenu } from "./TVInfiniteMenu";
import { BuyAllModal } from "./BuyAllModal";
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
  // Buy All Modal props
  showBuyAllModal?: boolean;
  onBuyAllModalChange?: (show: boolean) => void;
  sharedStrategy?: {
    name: string;
    coins: string[];
    eth: string;
  } | null;
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
  showBuyAllModal,
  onBuyAllModalChange,
  sharedStrategy,
}: TVControlsProps) {
  // Uncontrolled fallback for backward compatibility
  const [localModalState, setLocalModalState] = useState(false);
  const isControlled = showBuyAllModal !== undefined;
  const effectiveModalOpen = isControlled ? showBuyAllModal : localModalState;

  const handleModalChange = (newValue: boolean) => {
    onBuyAllModalChange?.(newValue);
    if (!isControlled) {
      setLocalModalState(newValue);
    }
  };

  return (
    <>
      <BuyAllModal 
        isOpen={effectiveModalOpen} 
        onClose={() => handleModalChange(false)} 
        items={videoItems}
        sharedStrategy={sharedStrategy}
      />
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

      {/* Gnars Buy All Button */}
      <button
        onClick={() => handleModalChange(true)}
        className="pointer-events-auto w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/60 hover:scale-105 active:scale-95 transition-all text-white"
        aria-label="Buy all content"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          strokeLinejoin="miter"
        >
          <path d="M18 12.5V10a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1.4"/>
          <path d="M14 11V9a2 2 0 1 0-4 0v2"/>
          <path d="M10 10.5V5a2 2 0 1 0-4 0v9"/>
          <path d="m7 15-1.76-1.76a2 2 0 0 0-2.83 2.82l3.6 3.6C7.5 21.14 9.2 22 12 22h2a8 8 0 0 0 8-8V7a2 2 0 1 0-4 0v5"/>
        </svg>
      </button>
      </div>
    </>
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
