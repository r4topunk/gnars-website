"use client";

// Floating Morpheus button on the stake page (prospecting side of the loop —
// MorLootbox handles collecting; this invites a NEW backer to stake).
//   button → "Gnars subnet" panel (pitch + Stake) → staking milestones → stake.
// Sits above the MiniTV (bottom-left); MorLootbox owns bottom-right.
//
// NOTE: milestone copy + targets are placeholders — swap for the real program.
// Strings are hardcoded EN for now (not yet wired to next-intl stake namespace).

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type View = "closed" | "intro" | "milestones";

const MILESTONES: { label: string; done: boolean }[] = [
  { label: "Subnet live — Gnars is a Morpheus Builder", done: true },
  { label: "First 10 backers on board", done: false },
  { label: "$10k staked — featured stakers wall", done: false },
  { label: "$50k staked — community drop", done: false },
  { label: "$100k staked — IRL Gnars event", done: false },
];

export function MorpheusStakeWidget() {
  const [view, setView] = useState<View>("closed");

  const goStake = () => {
    document.getElementById("stake-start")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setView("closed");
  };

  return (
    <div className="fixed left-4 bottom-[150px] z-40 flex flex-col items-start gap-3">
      <AnimatePresence>
        {view !== "closed" && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="w-[min(360px,calc(100vw-2rem))] max-h-[65vh] overflow-y-auto rounded-2xl border border-violet-500/30 bg-background/95 p-5 shadow-2xl backdrop-blur"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {view === "milestones" ? (
                  <button
                    type="button"
                    onClick={() => setView("intro")}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                ) : (
                  <Image src="/logos/morpheus.webp" alt="Morpheus" width={22} height={22} className="rounded" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Gnars subnet</span>
              </div>
              <button
                type="button"
                onClick={() => setView("closed")}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {view === "intro" ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black tracking-tight">Stake on the Gnars subnet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Back Gnars on Morpheus and put decentralized AI behind a real action-sports culture.
                    Self-custody on Ethereum mainnet — your keys the whole way.
                  </p>
                </div>
                <Button
                  onClick={() => setView("milestones")}
                  className="w-full bg-violet-500 text-white hover:bg-violet-600"
                >
                  Stake <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-black tracking-tight">Staking milestones</h3>
                  <p className="mt-1 text-xs text-muted-foreground">What the subnet unlocks as backing grows.</p>
                </div>
                <ol className="space-y-2.5">
                  {MILESTONES.map((m, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          m.done ? "bg-violet-500 text-white" : "border border-border text-muted-foreground"
                        }`}
                      >
                        {m.done ? <Check className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      </span>
                      <span className={`text-sm ${m.done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {m.label}
                      </span>
                    </li>
                  ))}
                </ol>
                <Button onClick={goStake} className="w-full bg-violet-500 text-white hover:bg-violet-600">
                  Stake now <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setView(view === "closed" ? "intro" : "closed")}
        aria-label="Stake on the Gnars subnet"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-violet-400/40 bg-background/90 shadow-lg backdrop-blur transition hover:scale-105"
      >
        {view === "closed" && (
          <span className="absolute inset-0 animate-ping rounded-full bg-violet-500/20" aria-hidden />
        )}
        <Image src="/logos/morpheus.webp" alt="Morpheus" width={34} height={34} className="relative rounded-full" />
      </button>
    </div>
  );
}
