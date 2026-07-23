"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StakeDialog } from "./StakeDialog";
import { YieldStatus } from "./YieldStatus";
import { getRider } from "@/lib/gnars-vaults";
import { useVaultTotal } from "@/hooks/use-vault-total";
import { VaultSupporters } from "./VaultSupporters";
import { useActiveAccount } from "thirdweb/react";

type CharacterId = "vlad" | "yan" | "r4to" | "pamtech" | "v2" | "zima";

// THPS-style attributes (1–10). Placeholder values — tailor freely.
const STAT_KEYS = [
  "speed",
  "air",
  "ollie",
  "spin",
  "rail",
  "flow",
  "devSkills",
  "creativity",
] as const;
type StatKey = (typeof STAT_KEYS)[number];
const STAT_MAX = 10;

interface Character {
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
  /** Character attributes, 1–STAT_MAX */
  stats: Record<StatKey, number>;
}

// Reward split when you stake as a rider (percent). Mirrors the vault: the
// depositor keeps half the yield, the rest is shared.
export const REWARD_SPLIT = { you: 50, skater: 25, treasury: 25 } as const;

const CHARACTERS: Character[] = [
  {
    id: "vlad",
    image: "/stake/cutout/vlad.png",
    accentFrom: "from-yellow-400",
    accentTo: "to-amber-600",
    ring: "ring-yellow-400",
    hex: "#f59e0b",
    face: { size: "420%", pos: "50% 6%" },
    stats: { speed: 9, air: 6, ollie: 7, spin: 5, rail: 8, flow: 9, devSkills: 10, creativity: 7 },
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
    face: { size: "420%", pos: "50% 8%" },
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
    stats: { speed: 8, air: 8, ollie: 7, spin: 8, rail: 7, flow: 9, devSkills: 6, creativity: 9 },
  },
];

// The arcade gold used for selection, bars and the overall score.
const GOLD = "linear-gradient(90deg,#f7c948,#f5851f)";
const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;

export function CharacterSelector() {
  const t = useTranslations("stake");
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const count = CHARACTERS.length;
  const active = CHARACTERS[index];
  const name = t(`characters.${active.id}.name`);
  const tagline = t(`characters.${active.id}.tagline`);
  const overall = Math.round(
    STAT_KEYS.reduce((sum, k) => sum + active.stats[k], 0) / STAT_KEYS.length,
  );

  // What the community has staked behind this rider, live from their vault.
  const rider = getRider(active.id);
  const vault = rider?.vault;
  const staked = useVaultTotal(vault);
  const you = useActiveAccount()?.address;

  const go = useCallback(
    (next: number) => {
      setDirection(next > index || (index === count - 1 && next === 0) ? 1 : -1);
      setIndex((next + count) % count);
    },
    [index, count],
  );

  const select = useCallback(
    (i: number) => {
      setDirection(i > index ? 1 : -1);
      setIndex(i);
    },
    [index],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  return (
    <div className="flex flex-col gap-7">
      {/* Stage + skills */}
      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-stretch">
        {/* Stage — the picked rider, full height */}
        <div
          className="relative flex min-h-[440px] items-end justify-center overflow-hidden rounded-[28px] border border-white/[0.06] sm:min-h-[560px] lg:min-h-[640px]"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 38%, rgba(245,140,30,.22) 0%, rgba(245,140,30,0) 52%), linear-gradient(180deg,#161210,#0c0a08)",
          }}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={active.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
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

          {/* Name plate */}
          <div className="pointer-events-none relative z-10 w-full bg-gradient-to-b from-transparent via-[#0c0a08]/60 to-[#0c0a08]/95 px-6 pb-7 pt-20 sm:px-8">
            <span
              className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold text-[#1a1205]"
              style={{ backgroundImage: GOLD }}
            >
              <Check className="h-3.5 w-3.5" />
              {t("selected")}
            </span>
            <h2 className="text-4xl font-black leading-none text-white sm:text-[46px]">{name}</h2>
            <p className="mt-2 text-[15px] text-white/75 sm:text-base">{tagline}</p>
            {/* What the community has behind this rider */}
            <p className="mt-3 text-sm text-white/60">
              {vault ? (
                staked === null ? (
                  <span className="opacity-60">carregando apoio…</span>
                ) : (
                  <>
                    <span className="font-mono text-base font-bold text-[#f7c948]">{usd(staked)}</span>{" "}
                    apoiando {name}
                  </>
                )
              ) : (
                <span className="opacity-70">cofre de patrocínio em breve</span>
              )}
            </p>
          </div>
        </div>

        {/* Skills */}
        <div className="flex flex-col rounded-[22px] border border-white/[0.06] bg-gradient-to-b from-[#181410]/85 to-[#0e0b09]/85 p-6 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50">
                {t("statsTitle")}
              </p>
              <p className="mt-1 truncate text-2xl font-extrabold text-white">{name}</p>
            </div>
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
          </div>

          <div className="flex flex-col gap-[15px]">
            {STAT_KEYS.map((key) => {
              const value = active.stats[key];
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

          <div className="my-5 h-px bg-white/[0.07]" />
          {/* Live on-chain yields as the rider's status */}
          <YieldStatus />
        </div>
      </div>

      {/* Roster — face-focused tiles */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-3.5">
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
                "relative aspect-[4/5] cursor-pointer overflow-hidden rounded-[14px] bg-gradient-to-b from-[#141210] to-[#0c0a08] shadow-[0_8px_22px_rgba(0,0,0,.4)] transition-transform duration-200",
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
                <span className="text-xs font-extrabold text-[#f7c948]">{cOverall}</span>
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

      {/* CTA */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">{t("selectedRider", { name })}</p>
        <Button size="lg" onClick={() => setDialogOpen(true)} className="cursor-pointer gap-2">
          <Zap className="h-4 w-4" />
          {t("stakeCta", { name })}
        </Button>
      </div>

      {/* Who's backing the picked rider */}
      <VaultSupporters
        vault={vault}
        feeRecipient={rider?.split}
        riderName={name}
        you={you}
      />

      <StakeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        riderId={active.id}
        name={name}
        image={active.image}
        accent={active.hex}
      />
    </div>
  );
}
