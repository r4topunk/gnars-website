"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, ChevronLeft, ChevronRight, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVaultTotal } from "@/hooks/use-vault-total";
import { getRider } from "@/lib/gnars-vaults";
import { cn } from "@/lib/utils";
import { StakeDialog } from "./StakeDialog";
import { YieldStatus } from "./YieldStatus";

export type CharacterId = "vlad" | "yan" | "r4to" | "pamtech" | "v2" | "zima" | "will";

// THPS-style attributes (1–10). Placeholder values — tailor freely.
export const STAT_KEYS = [
  "speed",
  "air",
  "ollie",
  "spin",
  "rail",
  "flow",
  "devSkills",
  "creativity",
] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export const STAT_MAX = 10;

export interface Character {
  id: CharacterId;
  image: string;
  /** Tailwind gradient stops for the accent glow, from → to */
  accentFrom: string;
  accentTo: string;
  /** Solid accent for rings/CTAs */
  ring: string;
  /** Accent as a hex color (for SVG flows / canvas) */
  hex: string;
  /**
   * Roster tiles zoom into the cut-out's head so the grid reads like a fighting
   * game's character select. The cut-outs are full-body, so each rider needs its
   * own zoom/offset to land on the face.
   */
  face: { size: string; pos: string };
  /**
   * Clip that replaces the still on the stage when the rider is clicked. It runs
   * once and hands the stage back. These are multi-MB files, so the <video> is
   * only mounted on that click — never preloaded, never fetched by a pointer
   * that merely passes over the card.
   */
  video?: string;
  /**
   * How `video` is composited.
   *
   * "footage" (default) — a landscape skate clip. It fills the card and is
   * cropped, under a scrim that keeps the name plate readable over moving image.
   *
   * "cutout" — an alpha video of the rider themselves (WebM/VP9, alpha in
   * BlockAdditions), framed exactly like the still it replaces, so hovering makes
   * the cut-out come alive in place. No scrim: there is nothing behind it but the
   * stage, which the name plate already sits on.
   */
  videoMode?: "footage" | "cutout";
  /** Character attributes, 1–STAT_MAX */
  stats: Record<StatKey, number>;
}

// Reward split when you stake as a rider (percent). Mirrors the vault: the
// depositor keeps half the yield, the rest is shared.
export const REWARD_SPLIT = { you: 50, skater: 25, treasury: 25 } as const;

// Exported (read-only) so anything else that needs the roster reads it from here
// instead of forking the data.
export const CHARACTERS: Character[] = [
  {
    id: "vlad",
    image: "/stake/cutout/vlad.png",
    accentFrom: "from-yellow-400",
    accentTo: "to-amber-600",
    ring: "ring-yellow-400",
    hex: "#f59e0b",
    face: { size: "420%", pos: "50% 6%" },
    video:
      "https://ipfs.skatehive.app/ipfs/bafybeiapkdzwrh3tv2dhaxkefzcwtoxekjaryecapa7kpqcaifqgwux3c4",
    stats: { speed: 7, air: 5, ollie: 8, spin: 9, rail: 2, flow: 9, devSkills: 10, creativity: 9 },
  },
  {
    id: "yan",
    image: "/stake/cutout/yan.png",
    accentFrom: "from-sky-400",
    accentTo: "to-blue-600",
    ring: "ring-sky-400",
    hex: "#0ea5e9",
    face: { size: "420%", pos: "50% 5%" },
    stats: { speed: 7, air: 8, ollie: 8, spin: 7, rail: 6, flow: 8, devSkills: 8, creativity: 9 },
  },
  {
    id: "r4to",
    image: "/stake/cutout/r4to.png",
    accentFrom: "from-fuchsia-400",
    accentTo: "to-purple-600",
    ring: "ring-fuchsia-400",
    hex: "#d946ef",
    face: { size: "420%", pos: "50% 5%" },
    // Same render as the still, so the hover swap lands on the same silhouette:
    // the rider fills 93.8% of the video's height against 93.9% of the still's.
    video: "/stake/video/r4to.webm",
    videoMode: "cutout",
    stats: { speed: 8, air: 7, ollie: 6, spin: 9, rail: 7, flow: 10, devSkills: 9, creativity: 10 },
  },
  {
    id: "pamtech",
    image: "/stake/cutout/pamtech.png",
    accentFrom: "from-emerald-400",
    accentTo: "to-green-600",
    ring: "ring-emerald-400",
    hex: "#10b981",
    face: { size: "420%", pos: "50% 9%" },
    stats: { speed: 6, air: 9, ollie: 9, spin: 6, rail: 10, flow: 7, devSkills: 9, creativity: 8 },
  },
  {
    id: "v2",
    image: "/stake/cutout/v2.png",
    accentFrom: "from-rose-400",
    accentTo: "to-red-600",
    ring: "ring-rose-400",
    hex: "#f43f5e",
    face: { size: "420%", pos: "50% 8%" },
    stats: { speed: 10, air: 7, ollie: 7, spin: 8, rail: 5, flow: 9, devSkills: 7, creativity: 9 },
  },
  {
    id: "zima",
    image: "/stake/cutout/zima.png",
    accentFrom: "from-teal-400",
    accentTo: "to-cyan-600",
    ring: "ring-teal-400",
    hex: "#14b8a6",
    face: { size: "330%", pos: "50% 3%" },
    stats: { speed: 8, air: 8, ollie: 3, spin: 8, rail: 10, flow: 9, devSkills: 6, creativity: 10 },
  },
  {
    id: "will",
    image: "/stake/cutout/will.png",
    accentFrom: "from-indigo-400",
    accentTo: "to-indigo-600",
    ring: "ring-indigo-400",
    hex: "#818cf8",
    face: { size: "400%", pos: "50% 8%" },
    stats: { speed: 7, air: 6, ollie: 7, spin: 7, rail: 8, flow: 8, devSkills: 5, creativity: 8 },
  },
];

// The arcade gold used for selection, bars and the overall score.
const GOLD = "linear-gradient(90deg,#f7c948,#f5851f)";
// App locale, not "en-US": this figure is the same number the orbit and the stat
// line print further down the page, and printing "$17.02" here under "$17,02"
// there read as two different amounts.
const usd = (n: number, locale: string) =>
  `$${n.toLocaleString(locale, { maximumFractionDigits: n < 100 ? 2 : 0 })}`;

/**
 * How the page-level composition (StakePageContent) turns off selector-owned
 * chrome it renders itself. Every field defaults to this component's standalone
 * behaviour, so omitting `preview` changes nothing.
 */
export type CharacterSelectorPreview = {
  /** false → do not rewrite the URL on mount/selection. Default true. */
  syncUrl?: boolean;
  /** true → render the Stake CTA as the last row of the name plate instead of absolutely positioned. Default false. */
  ctaInFlow?: boolean;
  /** false → hide the "Overall" score block in the skills panel. Default true. */
  showOverall?: boolean;
  /** false → hide the per-tile numeric score in the roster thumbnails. Default true. */
  showTileScore?: boolean;
  /** false → omit the rates block. YieldStatus takes no rider, so its APYs are
   *  global; a page that hoists it to page level must turn it off here or the
   *  same three rows render twice. Default true. */
  showRates?: boolean;
};

/**
 * The rider's stat sheet, rendered in two containers depending on the width: a
 * column beside the stage from `lg` up, and a panel toggled over the rider below
 * that — where a permanent second column has nowhere to go but under the art, and
 * stacked into a tall block of meters between the rider and the roster.
 *
 * One component for both so the two arms cannot drift.
 */
function StatSheet({
  character,
  showOverall,
  showRates,
  /** true → keep the header clear of the stage's floating toggle button. */
  reserveToggleSpace = false,
}: {
  character: Character;
  showOverall: boolean;
  showRates: boolean;
  reserveToggleSpace?: boolean;
}) {
  const t = useTranslations("stake");
  const name = t(`characters.${character.id}.name`);
  const overall = Math.round(
    STAT_KEYS.reduce((sum, k) => sum + character.stats[k], 0) / STAT_KEYS.length,
  );

  return (
    <>
      <div
        className={cn("mb-5 flex items-start justify-between gap-3", reserveToggleSpace && "pr-24")}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50">
            {t("statsTitle")}
          </p>
          <p className="mt-1 truncate text-2xl font-extrabold text-white">{name}</p>
        </div>
        {/* Only the visual block is optional — `overall` still feeds the stake
            dialog either way. */}
        {showOverall && (
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
              {t("overall")}
            </p>
            <p
              className="bg-clip-text text-4xl font-black leading-none tabular-nums text-transparent"
              style={{ backgroundImage: "linear-gradient(180deg,#f7c948,#f5851f)" }}
            >
              {overall}
            </p>
          </div>
        )}
      </div>

      {/* Tighter rhythm below `sm`: at the default gap the eight meters plus the
          header ran ~25px past a 440px stage in the overlay arm. */}
      <div className="flex flex-col gap-[11px] sm:gap-[15px]">
        {STAT_KEYS.map((key) => {
          const value = character.stats[key];
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-baseline justify-between text-[12.5px] font-semibold tracking-[0.12em]">
                <span className="uppercase text-white/60">{t(`stats.${key}`)}</span>
                <span className="tabular-nums text-white">{value}</span>
              </div>
              {/* Segmented arcade meter */}
              <div className="flex gap-[3px]">
                {Array.from({ length: STAT_MAX }, (_, i) => (
                  <div
                    key={i}
                    className="h-2 flex-1 rounded-[2px]"
                    style={
                      i < value
                        ? { backgroundImage: GOLD }
                        : { backgroundColor: "rgba(255,255,255,.09)" }
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showRates && (
        <>
          <div className="my-5 h-px bg-white/[0.07]" />
          {/* Live on-chain yields as the rider's status */}
          <YieldStatus />
        </>
      )}
    </>
  );
}

export function CharacterSelector({
  initialRider,
  onSelect,
  preview,
}: {
  initialRider?: string;
  /**
   * Fired when the user changes rider (arrows, arrow keys, roster tile) — the
   * same moment the URL sync below commits the new rider. Never on mount, so a
   * parent can seed itself from `initialRider` without an echo. Lets the page
   * keep something else (the sponsorship graph's focus) on the picked rider.
   */
  onSelect?: (id: CharacterId) => void;
  preview?: CharacterSelectorPreview;
} = {}) {
  const t = useTranslations("stake");
  const locale = useLocale();
  const pathname = usePathname();
  // Read the preview flags once, defaulting to today's behaviour.
  const syncUrl = preview?.syncUrl !== false;
  const ctaInFlow = preview?.ctaInFlow === true;
  const showOverall = preview?.showOverall !== false;
  const showTileScore = preview?.showTileScore !== false;
  const showRates = preview?.showRates !== false;
  const startIndex = Math.max(
    0,
    CHARACTERS.findIndex((c) => c.id === initialRider),
  );
  const [index, setIndex] = useState(startIndex);
  const [direction, setDirection] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  /**
   * The clip is click-to-play and runs once.
   *
   * "idle"    — the still. Always where a rider starts, including on the way
   *             back from another rider.
   * "playing" — <video> mounted and running. The file is only fetched here, so
   *             it is never downloaded for someone who does not ask for it.
   * "ended"   — <video> still mounted, paused on its last frame. It does NOT
   *             fade back to the still: the clip lands on a pose, and returning
   *             to the neutral photo throws that away.
   *
   * `showingVideo` is a separate "there is a frame on screen" signal: with
   * preload="none" there is a beat between the click and playback, and hiding
   * the still on the click alone blinks an empty stage.
   */
  const [clip, setClip] = useState<"idle" | "playing" | "ended">("idle");
  const [showingVideo, setShowingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const resetClip = useCallback(() => {
    setClip("idle");
    setShowingVideo(false);
  }, []);

  // From "ended" the element is already mounted with the file decoded, so a
  // replay is a seek rather than a remount — no second fetch, no blink.
  const startClip = useCallback(() => {
    const el = videoRef.current;
    if (el) {
      el.currentTime = 0;
      void el.play();
    }
    setClip("playing");
  }, []);
  // The stat sheet is a panel the reader opens over the rider, not a column
  // beside them. Closed by default: the stage is the point of this section, and
  // eight meters permanently parked next to it made the card mostly numbers.
  const [skillsOpen, setSkillsOpen] = useState(false);

  const count = CHARACTERS.length;
  const active = CHARACTERS[index];
  const isCutoutVideo = active.videoMode === "cutout";
  const name = t(`characters.${active.id}.name`);
  const tagline = t(`characters.${active.id}.tagline`);
  const overall = Math.round(
    STAT_KEYS.reduce((sum, k) => sum + active.stats[k], 0) / STAT_KEYS.length,
  );

  // What the community has staked behind this rider, live from their vault.
  const rider = getRider(active.id);
  const vault = rider?.vault;
  const staked = useVaultTotal(vault);

  // Both selectors stop the clip: the stage is about to hold a different rider,
  // and a <video> left mounted across the swap keeps playing the previous one
  // under the new name plate.
  const go = useCallback(
    (next: number) => {
      setDirection(next > index || (index === count - 1 && next === 0) ? 1 : -1);
      const i = (next + count) % count;
      setIndex(i);
      resetClip();
      onSelect?.(CHARACTERS[i].id);
    },
    [index, count, onSelect, resetClip],
  );

  const select = useCallback(
    (i: number) => {
      setDirection(i > index ? 1 : -1);
      setIndex(i);
      resetClip();
      onSelect?.(CHARACTERS[i].id);
    },
    [index, onSelect, resetClip],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
      // Escape closes the stat sheet: it covers the stage, so it is the one
      // thing here a reader can get "stuck" behind.
      if (e.key === "Escape") setSkillsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  // Keep the URL on the picked rider so anyone can copy the address bar and
  // share that rider's vault. replaceState rather than push — browsing the
  // roster with the arrows shouldn't stack up history entries. Opted out of on
  // routes that aren't /stake, where rewriting the path would navigate away.
  useEffect(() => {
    if (!syncUrl) return;
    if (typeof window === "undefined") return;
    const root = pathname.replace(/\/stake(\/[^/]+)?\/?$/, "/stake");
    const next = `${root}/${active.id}`;
    if (window.location.pathname !== next) window.history.replaceState(null, "", next);
  }, [active.id, pathname, syncUrl]);

  return (
    <div className="flex flex-col gap-7">
      {/* Two arms for the stat sheet, split at `lg` — the width where the second
          column actually fits. From `lg` up it is that column, unchanged. Below
          it the column has nowhere to go but under the art, so the sheet becomes
          a panel toggled over the rider and the stage takes the full width. */}
      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-stretch">
        <div
          // Leading `dark`, like ORBIT_STAGE: this stage is committed-dark artwork
          // in both themes, so anything rendered inside it must resolve the DARK
          // theme variables. Without it a light page left `--foreground` near-black
          // in here, and the first Card/Badge/Input someone drops in would paint
          // dark-on-dark. Nothing visible changes today — every child here already
          // states its own colour.
          className="dark relative flex min-h-[440px] items-end justify-center overflow-hidden rounded-[28px] border border-white/[0.06] sm:min-h-[560px] lg:min-h-[640px]"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 38%, rgba(245,140,30,.22) 0%, rgba(245,140,30,0) 52%), linear-gradient(180deg,#161210,#0c0a08)",
          }}
        >
          {/* Default (sync) mode: both cut-outs are absolutely positioned inside
              the stage and cross-fade in place. Avoid mode="popLayout" here — it
              portals the exiting cut-out onto document.body, where its
              top/bottom percentages blow up the page height and yank the scroll
              upward on every select. */}
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={active.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              // Hand over to the clip only once its first frame is on screen —
              // `playing` alone would blank the stage for the length of the
              // fetch. Fading out matters for footage clips, where the still
              // would otherwise show through above and below the frame.
              animate={{ opacity: showingVideo ? 0 : 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -60 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="absolute inset-x-0 bottom-[6%] top-[6%]"
            >
              <Image
                src={active.image}
                alt={name}
                fill
                priority
                unoptimized
                sizes="(max-width: 1024px) 90vw, 44rem"
                className="object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)]"
              />
            </motion.div>
          </AnimatePresence>

          {/* The clip, mounted only after a click, so the file is fetched on
              demand and never on page load. It runs ONCE and then STAYS, paused
              on its last frame — a <video> holds its final frame on its own, so
              "freeze" is simply not unmounting. Switching rider is what puts the
              still back. */}
          {clip !== "idle" && active.video && (
            <motion.div
              key={`${active.id}-video`}
              initial={{ opacity: 0 }}
              animate={{ opacity: showingVideo ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              aria-hidden
              className={cn(
                "pointer-events-none absolute",
                // Cut-out clips take the still's exact box, so the rider animates
                // where they already stood. Footage clips are landscape and would
                // letterbox into a band in a portrait card, so they fill it and
                // crop — the card's overflow-hidden keeps the corners.
                isCutoutVideo ? "inset-x-0 bottom-[6%] top-[6%]" : "inset-0",
              )}
            >
              <video
                ref={videoRef}
                src={active.video}
                autoPlay
                muted
                playsInline
                preload="none"
                // `onPlaying` is the honest "there is a frame on screen" event;
                // `onCanPlay` fires before the first paint and still blinks.
                onPlaying={() => setShowingVideo(true)}
                onEnded={() => setClip("ended")}
                // A clip that fails to load must not leave the stage empty.
                onError={resetClip}
                className={cn("h-full w-full", isCutoutVideo ? "object-contain" : "object-cover")}
              />
              {/* Scrim for footage only: it keeps the name plate readable over a
                  moving image. A cut-out clip is transparent around the rider, so
                  the plate is still sitting on the stage and a scrim would only
                  dim the art. */}
              {!isCutoutVideo && (
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a08]/85 via-transparent to-[#0c0a08]/25" />
              )}
            </motion.div>
          )}

          {/* The play target: the rider themselves, not the whole stage. A card-
              sized hit area would swallow the empty margins either side of a
              standing figure, and those margins are where someone drags or
              reaches for a chevron.

              Sized off the art rather than the card: the still is `object-contain`
              in a box inset 6% top and bottom, so it is always height-limited here
              and the figure lands at roughly a 2:5 box centred in the stage. That
              clears the chevrons (which sit against the left and right edges) at
              every width.

              Sits before the name plate in the DOM and takes no z-index, so the
              plate's own CTA — which re-enables pointer events inside a
              pointer-events-none plate — still wins the click on a phone, where
              the two overlap.

              While the clip runs it is inert: `pointer-events-none` both drops the
              cursor back to the default and makes a second click a no-op until the
              video ends. */}
          {active.video && (
            <button
              type="button"
              onClick={startClip}
              aria-label={t("playClip", { name })}
              className={cn(
                "absolute inset-y-[8%] left-1/2 aspect-[2/5] -translate-x-1/2 rounded-2xl",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60",
                clip === "playing" ? "pointer-events-none" : "cursor-pointer",
              )}
            />
          )}

          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label={t("prev")}
            className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/[0.12] bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label={t("next")}
            className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/[0.12] bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Stat-sheet toggle — below `lg` only, where the sheet is an overlay.
            From `lg` up the sheet is a column that is always on screen, so a
            control for it would toggle nothing. Above the overlay's own z-index
            so it is always the way back out, and labelled with the same word the
            sheet's header uses rather than a new one. */}
          <button
            type="button"
            onClick={() => setSkillsOpen((v) => !v)}
            aria-expanded={skillsOpen}
            className="absolute right-4 top-4 z-50 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/[0.12] bg-black/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm transition hover:bg-black/60 lg:hidden"
          >
            {skillsOpen ? <X className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
            {t("statsTitle")}
          </button>

          {/* The overlay arm of the sheet. Fades only — it is a layer arriving, not
            an object travelling, and sliding eight meters in reads as a slower
            interface. `lg:hidden` rather than an unmount: a reader who opens it
            on a phone and rotates into the `lg` range finds the column already
            showing the same numbers, so nothing has to be re-opened.
            `overflow-y-auto` because the full sheet is a few pixels taller than
            the stage at the smallest phone height. */}
          <AnimatePresence>
            {skillsOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute inset-0 z-40 flex flex-col justify-center overflow-y-auto bg-[#0c0a08]/92 px-6 py-6 backdrop-blur-sm sm:px-8 lg:hidden"
              >
                {/* The scrim covers the whole stage, the sheet does not: on a tablet
                  the stage is wide enough that each meter segment stretched into a
                  bar and the rows stopped reading as scores. */}
                <div className="mx-auto w-full max-w-2xl">
                  <StatSheet
                    character={active}
                    showOverall={showOverall}
                    showRates={showRates}
                    reserveToggleSpace
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name plate. No "selected" badge: the stage only ever shows the rider
              you picked, and the roster tile below already carries the ring and the
              P1 marker, so the badge restated a fact nothing contradicted. */}
          <div className="pointer-events-none relative z-10 w-full bg-gradient-to-b from-transparent via-[#0c0a08]/60 to-[#0c0a08]/95 px-6 pb-7 pt-20 sm:px-8">
            <h2 className="text-4xl font-black leading-none text-white sm:text-[46px]">{name}</h2>
            <p className="mt-2 text-[15px] text-white/75 sm:text-base">{tagline}</p>
            {/* What the community has behind this rider */}
            <p className="mt-3 text-sm text-white/60">
              {vault ? (
                staked === null ? (
                  <span className="opacity-60">{t("loadingSupport")}</span>
                ) : (
                  t.rich("backing", {
                    name,
                    amount: usd(staked, locale),
                    b: (chunks) => (
                      <span className="font-mono text-base font-bold text-[#f7c948]">{chunks}</span>
                    ),
                  })
                )
              ) : (
                <span className="opacity-70">{t("vaultSoon")}</span>
              )}
            </p>
            {/* In-flow CTA — same button as the floating one, stacked as the
                plate's last row. The plate is pointer-events-none, so the button
                has to hand its own pointer events back or it reads as dead.

                This is the DEFAULT below `sm`, not just a `ctaInFlow` opt-in: the
                floating variant is positioned bottom-right over a full-width meta
                line, and on every phone width (320–430 measured) it painted over
                the end of "$17.02 backing Vlad" — occluded, not truncated, so
                there was not even an ellipsis to say the rider's name was missing.
                Around 460px the two stop intersecting; `sm` (640px) is the first
                breakpoint clear of it, so from there up the float is back and the
                approved desktop layout is untouched. `ctaInFlow` still forces
                in-flow at every width. */}
            <Button
              size="lg"
              onClick={() => setDialogOpen(true)}
              className={cn(
                "pointer-events-auto mt-5 h-12 w-full cursor-pointer gap-2 border-0 font-bold text-[#1a1205] shadow-[0_8px_24px_rgba(245,133,31,.35)] hover:opacity-90 sm:h-10 sm:w-auto",
                !ctaInFlow && "sm:hidden",
              )}
              style={{ backgroundImage: GOLD }}
            >
              <Zap className="h-4 w-4" />
              {t("stakeCta", { name })}
            </Button>
          </div>

          {/* Stake CTA — bottom-right of the card, above the name plate. From `sm`
              up only; below that the in-flow copy above is the one that renders. */}
          {!ctaInFlow && (
            <Button
              size="lg"
              onClick={() => setDialogOpen(true)}
              className="absolute bottom-5 right-5 z-30 hidden cursor-pointer gap-2 border-0 font-bold text-[#1a1205] shadow-[0_8px_24px_rgba(245,133,31,.35)] hover:opacity-90 sm:inline-flex"
              style={{ backgroundImage: GOLD }}
            >
              <Zap className="h-4 w-4" />
              {t("stakeCta", { name })}
            </Button>
          )}
        </div>

        {/* The column arm of the sheet — `lg` and up, unchanged. `dark` for the
            same reason as the stage, and here it is load-bearing the moment
            `showRates` is on: <YieldStatus/> renders shadcn chrome inside it. */}
        <div className="dark hidden flex-col rounded-[22px] border border-white/[0.06] bg-gradient-to-b from-[#181410]/85 to-[#0e0b09]/85 p-6 sm:p-7 lg:flex">
          <StatSheet character={active} showOverall={showOverall} showRates={showRates} />
        </div>
      </div>

      {/* Roster — face-focused tiles on ONE line that scrolls sideways. It used
          to wrap into rows, which left the seventh rider alone under a full row
          at every width (a grid gap that read as a rendering fault). One row also
          means the roster's height never changes with the roster's length.

          Below `sm` the tiles are a fixed 28% so a fourth peeks in at the edge —
          that clipped tile is the affordance that says the row scrolls. From `sm`
          up they share the row (`basis-0 grow`), so all seven fit and there is
          nothing to scroll. */}
      <div
        role="group"
        // Revives `stake.chooseLabel`, which the old page header used to print and
        // which nothing has rendered since the redesign moved that copy into the
        // section header. A scroll row of unlabelled portraits needs the name.
        aria-label={t("chooseLabel")}
        className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 sm:gap-3.5"
      >
        {CHARACTERS.map((c, i) => {
          const isActive = i === index;
          const cOverall = Math.round(
            STAT_KEYS.reduce((sum, k) => sum + c.stats[k], 0) / STAT_KEYS.length,
          );
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => select(i)}
              aria-label={t(`characters.${c.id}.name`)}
              aria-pressed={isActive}
              className={cn(
                "relative aspect-[4/5] cursor-pointer snap-start overflow-hidden rounded-[14px] bg-gradient-to-b from-[#141210] to-[#0c0a08] shadow-[0_8px_22px_rgba(0,0,0,.4)] transition-transform duration-200",
                // Phone: a fixed 28% so the row overflows and a fourth tile peeks.
                // From `sm`: share the row so all seven fit without scrolling.
                "shrink-0 basis-[28%] sm:shrink sm:grow sm:basis-0",
                isActive ? "" : "hover:-translate-y-[3px]",
              )}
            >
              {/* zoomed into the head — the fighting-game portrait */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  backgroundImage: `url("${c.image}")`,
                  backgroundSize: c.face.size,
                  backgroundPosition: c.face.pos,
                  backgroundRepeat: "no-repeat",
                }}
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg,rgba(0,0,0,0) 48%,rgba(8,6,5,.35) 66%,rgba(8,6,5,.92) 100%)",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 pb-2.5 pt-2">
                <span className="truncate text-sm font-extrabold text-white">
                  {t(`characters.${c.id}.name`)}
                </span>
                {showTileScore && (
                  <span className="text-xs font-extrabold text-[#f7c948]">{cOverall}</span>
                )}
              </div>

              {isActive && (
                <>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[14px] border-[3px] border-[#f5a623]"
                    style={{
                      boxShadow:
                        "0 0 0 2px rgba(245,166,35,.25),0 0 30px rgba(245,133,31,.4),inset 0 0 26px rgba(245,133,31,.16)",
                    }}
                  />
                  <span
                    className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-[0.08em] text-[#1a1205]"
                    style={{ backgroundImage: GOLD }}
                  >
                    P1
                  </span>
                </>
              )}
            </button>
          );
        })}
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
