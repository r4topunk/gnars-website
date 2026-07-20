"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CharacterId = "vlad" | "yan" | "r4to" | "pamtech" | "v2";

// THPS-style attributes (1–10). Placeholder values — tailor freely.
const STAT_KEYS = ["speed", "air", "ollie", "spin", "rail", "flow"] as const;
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
  /** Character attributes, 1–STAT_MAX */
  stats: Record<StatKey, number>;
}

const CHARACTERS: Character[] = [
  {
    id: "vlad",
    image: "/stake/cutout/vlad.png",
    accentFrom: "from-yellow-400",
    accentTo: "to-amber-600",
    ring: "ring-yellow-400",
    stats: { speed: 9, air: 6, ollie: 7, spin: 5, rail: 8, flow: 9 },
  },
  {
    id: "yan",
    image: "/stake/cutout/yan.png",
    accentFrom: "from-sky-400",
    accentTo: "to-blue-600",
    ring: "ring-sky-400",
    stats: { speed: 7, air: 8, ollie: 8, spin: 7, rail: 6, flow: 8 },
  },
  {
    id: "r4to",
    image: "/stake/cutout/r4to.png",
    accentFrom: "from-fuchsia-400",
    accentTo: "to-purple-600",
    ring: "ring-fuchsia-400",
    stats: { speed: 8, air: 7, ollie: 6, spin: 9, rail: 7, flow: 10 },
  },
  {
    id: "pamtech",
    image: "/stake/cutout/pamtech.png",
    accentFrom: "from-emerald-400",
    accentTo: "to-green-600",
    ring: "ring-emerald-400",
    stats: { speed: 6, air: 9, ollie: 9, spin: 6, rail: 10, flow: 7 },
  },
  {
    id: "v2",
    image: "/stake/cutout/v2.png",
    accentFrom: "from-rose-400",
    accentTo: "to-red-600",
    ring: "ring-rose-400",
    stats: { speed: 10, air: 7, ollie: 7, spin: 8, rail: 5, flow: 9 },
  },
];

export function CharacterSelector() {
  const t = useTranslations("stake");
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const count = CHARACTERS.length;
  const active = CHARACTERS[index];
  const name = t(`characters.${active.id}.name`);
  const tagline = t(`characters.${active.id}.tagline`);
  const overall = Math.round(
    STAT_KEYS.reduce((sum, k) => sum + active.stats[k], 0) / STAT_KEYS.length,
  );

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

  const handleStake = () => {
    toast.success(t("stakeToast", { name }));
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Stage + stats, side by side on desktop */}
      <div className="grid w-full max-w-5xl items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Stage */}
        <div className="relative mx-auto w-full max-w-md">
          {/* soft ambient edge glow — subtle */}
          <div
            aria-hidden
            className={cn(
              "absolute -inset-1 -z-10 rounded-[1.75rem] bg-gradient-to-br opacity-20 blur-xl transition-colors duration-500",
              active.accentFrom,
              active.accentTo,
            )}
          />

          {/* prev / next */}
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label={t("prev")}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/70 p-2 shadow-md backdrop-blur-sm transition hover:scale-110 hover:bg-background cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label={t("next")}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-background/70 p-2 shadow-md backdrop-blur-sm transition hover:scale-110 hover:bg-background cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-muted/30 via-background to-background shadow-2xl">
            {/* accent spotlight behind the cut-out character — soft + contained */}
            <div
              aria-hidden
              className={cn(
                "absolute left-1/2 top-1/3 h-1/2 w-3/5 -translate-x-1/2 rounded-full bg-gradient-to-br opacity-[0.18] blur-3xl transition-colors duration-500",
                active.accentFrom,
                active.accentTo,
              )}
            />
            {/* grounding floor glow under the board */}
            <div
              aria-hidden
              className={cn(
                "absolute bottom-6 left-1/2 h-10 w-1/2 -translate-x-1/2 rounded-[50%] bg-gradient-to-r opacity-25 blur-2xl transition-colors duration-500",
                active.accentFrom,
                active.accentTo,
              )}
            />

            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={active.id}
                custom={direction}
                initial={{ opacity: 0, x: direction * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -60 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="absolute inset-0 flex items-end justify-center px-6 pt-8"
              >
                <Image
                  src={active.image}
                  alt={name}
                  width={1086}
                  height={1448}
                  priority
                  unoptimized
                  sizes="(max-width: 768px) 90vw, 28rem"
                  className="h-full w-full object-contain object-bottom drop-shadow-[0_18px_35px_rgba(0,0,0,0.45)]"
                />
              </motion.div>
            </AnimatePresence>

            {/* bottom scrim + name */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 pt-16">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-6 items-center gap-1 rounded-full bg-gradient-to-r px-2 text-[11px] font-semibold text-white",
                    active.accentFrom,
                    active.accentTo,
                  )}
                >
                  <Check className="h-3 w-3" />
                  {t("selected")}
                </span>
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{name}</h2>
              <p className="text-sm text-white/80">{tagline}</p>
            </div>
          </div>
        </div>

        {/* Stats panel — THPS-style attributes */}
        <div className="flex flex-col rounded-3xl border border-border/60 bg-gradient-to-b from-muted/30 via-background to-background p-5 shadow-2xl lg:p-6">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("statsTitle")}
              </p>
              <p className="truncate text-lg font-bold leading-tight">{name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("overall")}
              </p>
              <p
                className={cn(
                  "bg-gradient-to-r bg-clip-text text-4xl font-black tabular-nums text-transparent",
                  active.accentFrom,
                  active.accentTo,
                )}
              >
                {overall}
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center gap-4">
            {STAT_KEYS.map((key) => {
              const value = active.stats[key];
              return (
                <div key={key}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t(`stats.${key}`)}
                    </span>
                    <span className="text-sm font-bold tabular-nums">{value}</span>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r",
                        active.accentFrom,
                        active.accentTo,
                      )}
                      initial={false}
                      animate={{ width: `${(value / STAT_MAX) * 100}%` }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                    {/* THPS-style segment notches */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_calc(10%_-_1.5px),rgba(0,0,0,0.4)_calc(10%_-_1.5px),rgba(0,0,0,0.4)_10%)]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Thumbnail rail */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {CHARACTERS.map((c, i) => {
          const isActive = i === index;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => select(i)}
              aria-label={t(`characters.${c.id}.name`)}
              aria-pressed={isActive}
              className={cn(
                "relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-xl border bg-muted transition-all duration-200 cursor-pointer sm:w-20",
                isActive
                  ? cn("scale-105 ring-2 ring-offset-2 ring-offset-background", c.ring)
                  : "opacity-60 hover:opacity-100",
              )}
            >
              <Image
                src={c.image}
                alt={t(`characters.${c.id}.name`)}
                fill
                unoptimized
                sizes="5rem"
                className="object-contain object-bottom p-1"
              />
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">{t("selectedRider", { name })}</p>
        <Button size="lg" onClick={handleStake} className="cursor-pointer gap-2">
          <Zap className="h-4 w-4" />
          {t("stakeCta", { name })}
        </Button>
      </div>
    </div>
  );
}
