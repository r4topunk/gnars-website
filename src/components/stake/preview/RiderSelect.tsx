"use client";

// Rider picker for the /stake/preview prototype.
//
// Forked from CharacterSelector on purpose: the first prototype only reordered
// sections and read as "practically identical" to production, and the selector is
// most of the page's visual mass. So this is where the new language has to be
// visible — editorial two-column plate instead of the arcade cabinet:
//
//   production                      here
//   ─────────────────────────────   ────────────────────────────────────────
//   560–640px stage + name plate    4:5 stage (~40%) + typographic right column
//   8 segmented 10-cell meters      no meters: name, tagline, real backing, CTA
//   "Overall" score, P1 badge       no numbers anywhere
//   6-col roster grid w/ scores     one horizontal scroll-snap row of portraits
//   replaceState on every select    no URL writes (preview stays on /stake/preview)
//
// v3 killed the stat meters outright: placeholder values drawn as filled tracks
// read as measurement, and nothing behind them is measured. The right column is
// now the only claim the page makes about a rider that is actually true.
//
// The roster data itself is NOT forked — it is imported from the production
// component, so riders/stats/art can never drift between the two routes.
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useVaultTotal } from "@/hooks/use-vault-total";
import { getRider, type RiderId } from "@/lib/gnars-vaults";
import { cn } from "@/lib/utils";
import { CHARACTERS, STAT_KEYS } from "../CharacterSelector";
import { StakeDialog } from "../StakeDialog";

// The page's single accent. 135° per the spec (production uses 90°).
const GOLD = "linear-gradient(135deg,#f7c948,#f5851f)";
const GOLD_SOLID = "#f7c948";
const INK = "#1a1205";

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;

export interface RiderSelectProps {
  /** Rider to open on. Falls back to the first of the roster. */
  initialRider?: RiderId;
  /** Fired on user-driven changes only — never on mount, so the parent can seed
   *  itself from `initialRider` without an echo. */
  onSelect?: (id: RiderId) => void;
}

export function RiderSelect({ initialRider, onSelect }: RiderSelectProps) {
  const t = useTranslations("stake");
  const tr = useTranslations("stake.preview.rider");

  const startIndex = Math.max(
    0,
    CHARACTERS.findIndex((c) => c.id === initialRider),
  );
  const [index, setIndex] = useState(startIndex);
  const [dialogOpen, setDialogOpen] = useState(false);
  // The clip is multi-MB, so the <video> only exists while the pointer is on the
  // stage — same deal as production: never preloaded, never fetched on load.
  const [hovered, setHovered] = useState(false);

  const count = CHARACTERS.length;
  const active = CHARACTERS[index];
  const name = t(`characters.${active.id}.name`);
  const tagline = t(`characters.${active.id}.tagline`);

  // Never rendered on this page — the only consumer left is StakeDialog, which
  // still prints an overall score in its own header.
  const overall = Math.round(
    STAT_KEYS.reduce((sum, k) => sum + active.stats[k], 0) / STAT_KEYS.length,
  );

  // What the community has behind this rider, live from their vault.
  const staked = useVaultTotal(getRider(active.id)?.vault);
  const hasVault = Boolean(getRider(active.id)?.vault);

  const go = useCallback(
    (next: number) => {
      const i = (next + count) % count;
      setIndex(i);
      onSelect?.(CHARACTERS[i].id);
    },
    [count, onSelect],
  );

  useEffect(() => {
    if (dialogOpen) return; // arrows belong to the dialog's inputs while it is open
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, dialogOpen]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-center">
        {/* Stage — the only gradient allowed on the page lives in here */}
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/[0.08]"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 34%, rgba(245,140,30,.20) 0%, rgba(245,140,30,0) 55%), linear-gradient(180deg,#161210,#0c0a08)",
          }}
        >
          {/* Cross-fade in place: both cut-outs are absolute, so switching riders
              never reflows the column (and never yanks the scroll). */}
          <AnimatePresence initial={false}>
            <motion.div
              key={active.id}
              initial={{ opacity: 0, scale: 1.03 }}
              // Fade the still out while the clip plays, otherwise the cut-out
              // shows through above and below the footage.
              animate={{ opacity: hovered && active.video ? 0 : 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="absolute inset-x-0 bottom-[4%] top-[4%]"
            >
              <Image
                src={active.image}
                alt={name}
                fill
                priority
                unoptimized
                sizes="(max-width: 640px) 90vw, 30rem"
                className="object-contain drop-shadow-[0_24px_34px_rgba(0,0,0,0.5)]"
              />
            </motion.div>
          </AnimatePresence>

          {hovered && active.video && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              aria-hidden
              className="pointer-events-none absolute inset-0"
            >
              {/* landscape clips in a portrait frame: crop, don't letterbox */}
              <video
                src={active.video}
                autoPlay
                loop
                muted
                playsInline
                preload="none"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a08]/70 via-transparent to-transparent" />
            </motion.div>
          )}
        </div>

        {/* Plate — typography does the work here, no chrome */}
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <h2 className="text-3xl font-black tracking-tight text-white">{name}</h2>
            <p className="text-sm text-white/50">{tagline}</p>
            <p className="font-mono text-sm text-white/50">
              {!hasVault ? (
                t("vaultSoon")
              ) : staked === null ? (
                t("loadingSupport")
              ) : (
                <>
                  {t.rich("backing", {
                    name,
                    amount: usd(staked),
                    b: (chunks) => (
                      <span className="font-bold" style={{ color: GOLD_SOLID }}>
                        {chunks}
                      </span>
                    ),
                  })}
                </>
              )}
            </p>
          </div>

          <Button
            onClick={() => setDialogOpen(true)}
            className="h-11 w-full cursor-pointer border-0 font-bold hover:opacity-90 sm:w-auto"
            style={{ backgroundImage: GOLD, color: INK }}
          >
            {t("stakeCta", { name })}
          </Button>
        </div>
      </div>

      {/* Roster — one scroll-snap row of portraits. No scores, no P1 badge. */}
      <div>
        <div
          role="group"
          aria-label={tr("rosterLabel")}
          className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1"
        >
          {CHARACTERS.map((c, i) => {
            const isActive = i === index;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => go(i)}
                aria-pressed={isActive}
                className={cn(
                  // Peek layout on mobile: ~4.5 tiles in view, so the clipped
                  // fifth is the affordance that says "this row scrolls".
                  // From sm up the row fits, so tiles go back to a fixed 5rem.
                  "shrink-0 basis-[22%] cursor-pointer snap-start text-left transition-opacity",
                  "sm:w-20 sm:basis-auto",
                  isActive ? "opacity-100" : "opacity-60 hover:opacity-100",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "block aspect-[4/5] rounded-lg bg-white/[0.03]",
                    isActive && "ring-2 ring-[#f7c948]",
                  )}
                  style={{
                    backgroundImage: `url("${c.image}")`,
                    backgroundSize: c.face.size,
                    backgroundPosition: c.face.pos,
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <span
                  className={cn(
                    "mt-1.5 block truncate text-xs",
                    isActive ? "font-semibold text-white" : "text-white/50",
                  )}
                >
                  {t(`characters.${c.id}.name`)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-3">
          {/* Position works on every input: touch users get no arrow hint, and
              the peeking tile alone does not say how much row is left. */}
          <span className="font-mono text-xs text-white/35">
            {tr("position", { current: index + 1, total: count })}
          </span>
          {/* Keyboard hint only where a keyboard exists — on touch it is noise, the
              exact copy mistake the design review flagged on production's intro. */}
          <p className="hidden text-xs text-white/35 sm:block">{tr("hint")}</p>
        </div>
      </div>

      <StakeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        riderId={active.id}
        name={name}
        image={active.image}
        accent={active.hex}
        overall={overall}
        faceSize={active.face.size}
        facePos={active.face.pos}
      />
    </div>
  );
}
