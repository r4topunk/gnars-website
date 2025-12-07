"use client";

import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TVHeaderProps {
  isMuted: boolean;
  onToggleMute: () => void;
}

/**
 * Header bar for the TV player with title and mute button
 */
export function TVHeader({ isMuted, onToggleMute }: TVHeaderProps) {
  return (
    <div className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
      <div className="text-base font-bold pointer-events-auto tracking-tight">Gnar TV</div>
      <Button
        onClick={onToggleMute}
        size="icon"
        variant="secondary"
        className="pointer-events-auto bg-black/40 text-white hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full"
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>
    </div>
  );
}
