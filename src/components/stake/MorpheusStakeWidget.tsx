"use client";

// Floating Morpheus button on the stake page (prospecting side of the loop —
// MorLootbox handles collecting; this invites a NEW backer to stake). Tapping it
// opens the full GnarsStakeDialog (pitch + staking milestones + stake/withdraw).
// Sits above the MiniTV (bottom-left); MorLootbox owns bottom-right.

import Image from "next/image";
import { useState } from "react";
import { GnarsStakeDialog } from "@/components/stake/GnarsStakeDialog";

export function MorpheusStakeWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed right-5 bottom-24 z-40 flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Back Gnars on the Morpheus subnet"
          className="group relative flex h-16 w-16 items-center justify-center rounded-full border border-violet-300/50 bg-gradient-to-br from-violet-600 to-violet-500 shadow-[0_0_24px_rgba(139,92,246,.55)] transition hover:scale-105"
        >
          {!open && (
            <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/30" aria-hidden />
          )}
          <Image src="/logos/morpheus.webp" alt="Morpheus" width={38} height={38} className="relative rounded-full" />
        </button>
      </div>

      <GnarsStakeDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
