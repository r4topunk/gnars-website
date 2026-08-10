"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type Rarity = "legendary" | "epic" | "rare" | "uncommon" | "common";

/**
 * Rarity is a presentation of reward size, not a property of the bounty — the
 * richest open bounty is Legendary, the leanest Common. Colours mirror the
 * loot-tier convention players already read without a legend.
 */
export const RARITY: Record<Rarity, { color: string; art: string }> = {
  legendary: { color: "#f7c948", art: "linear-gradient(160deg,#3d3110,#141005)" },
  epic: { color: "#a78bfa", art: "linear-gradient(160deg,#2a1b3d,#120c1a)" },
  rare: { color: "#60a5fa", art: "linear-gradient(160deg,#0d2340,#04101f)" },
  uncommon: { color: "#4ade80", art: "linear-gradient(160deg,#0e2c1c,#06120c)" },
  common: { color: "#9ca3af", art: "linear-gradient(160deg,#26262b,#101013)" },
};

export interface BountyCardData {
  id: string;
  href: string;
  code: string;
  category: string;
  title: string;
  eth: string;
  usd: string;
  age: string;
  chain: string;
  status: string;
  statusTone: "open" | "voting" | "closed";
  serial: string;
  rarity: Rarity;
  thumbnail: string | null;
  tags: string[];
  /** Back of the card. */
  description: string;
  issuer: string;
  deadline: string | null;
  claims: number;
}

const STATUS_COLOR = {
  open: "#4ade80",
  voting: "#facc15",
  closed: "#a3a3a3",
} as const;

/** The bordered, rarity-glowing shell both faces share. */
function Face({
  color,
  featured,
  className,
  children,
  ...rest
}: {
  color: string;
  featured: boolean;
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#1b1b1b,#0e0e0e)]",
        className,
      )}
      style={{
        border: `1px solid ${color}${featured ? "aa" : "40"}`,
        boxShadow: `0 0 0 1px ${color}${featured ? "55" : "22"}, 0 0 ${
          featured ? 44 : 16
        }px ${color}${featured ? "4d" : "20"}, 0 20px 40px rgba(0,0,0,.6)`,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * One bounty as a two-sided trading card.
 *
 * Front is the collectible: code/title/reward, class+status plate, art window,
 * POSTED/CHAIN/USD strip, tag pills — a fixed order so a fanned hand reads as a
 * set even when only the top third of each card shows. Back carries the actual
 * brief (description, issuer, deadline, claims) and the link out to poidh.
 *
 * Faces are siblings inside a `preserve-3d` container, never nested, so the
 * back's link and the front's select button are separate interactive elements
 * instead of an illegal button-inside-button.
 */
export function BountyTradingCard({
  bounty,
  /** Raised card in the fan: full colour, glow, no dimming. */
  featured,
  /** Showing the back. Only ever true for the focused card. */
  flipped = false,
  shineDelayMs = 0,
  /** Fires on any click of the front face — select, or flip if already focused. */
  onFrontClick,
  onFlipBack,
}: {
  bounty: BountyCardData;
  featured: boolean;
  flipped?: boolean;
  shineDelayMs?: number;
  onFrontClick?: () => void;
  onFlipBack?: () => void;
}) {
  const t = useTranslations("newhome.bounties.card");
  const tBack = useTranslations("newhome.bounties.back");
  const { color, art } = RARITY[bounty.rarity];
  const rarityLabel = useTranslations("newhome.bounties.rarity")(bounty.rarity);

  return (
    <div className="perspective-1000 h-full w-full">
      <div
        className="transform-style-3d relative h-full w-full transition-transform duration-500 motion-reduce:transition-none"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* ── Front ─────────────────────────────────────────── */}
        <div
          className={cn("backface-hidden absolute inset-0", flipped && "pointer-events-none")}
          aria-hidden={flipped}
        >
          <Face color={color} featured={featured}>
            {/* Holo sheen across the whole card */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 mix-blend-screen"
              style={{
                background: `linear-gradient(115deg,transparent 35%,${color}2e 48%,transparent 62%)`,
              }}
            />

            <button
              type="button"
              onClick={onFrontClick}
              tabIndex={flipped ? -1 : 0}
              aria-label={featured ? tBack("flipTo", { title: bounty.title }) : bounty.title}
              className="relative flex h-full w-full flex-col text-left"
            >
              <div className="relative flex flex-col gap-2.5 px-[18px] pt-4">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <span
                      className="block font-mono text-[10px] font-bold tracking-[0.08em]"
                      style={{ color }}
                    >
                      {bounty.code}
                    </span>
                    <h3 className="mt-[3px] line-clamp-2 min-h-[36px] text-[14.5px] font-extrabold leading-[1.25] text-white">
                      {bounty.title}
                    </h3>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block font-mono text-xl font-extrabold tabular-nums text-white">
                      {bounty.eth}
                    </span>
                    <span className="text-[10px] font-semibold text-neutral-400">ETH</span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-400">
                  {bounty.category} · {t("type")}
                </p>

                <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-white/10">
                  <div className="bg-black/35 px-3 py-2">
                    <span className="block text-[9.5px] font-bold tracking-[0.1em] text-neutral-500">
                      {t("class")}
                    </span>
                    <span className="block text-[13.5px] font-bold" style={{ color }}>
                      {rarityLabel}
                    </span>
                  </div>
                  <div className="border-l border-white/[0.08] bg-black/35 px-3 py-2">
                    <span className="block text-[9.5px] font-bold tracking-[0.1em] text-neutral-500">
                      {t("status")}
                    </span>
                    <span
                      className="block text-[13.5px] font-bold"
                      style={{ color: STATUS_COLOR[bounty.statusTone] }}
                    >
                      {bounty.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Art window: the bounty's own thumbnail when it has one, else the mark. */}
              <div
                className="relative mx-[18px] mt-3 flex aspect-[16/10] items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.08] bg-cover bg-center"
                style={
                  bounty.thumbnail
                    ? { backgroundImage: `url("${bounty.thumbnail}")` }
                    : { backgroundImage: art }
                }
              >
                <span
                  aria-hidden
                  className="absolute -left-[30%] -top-[20%] h-[140%] w-[60%] bg-[linear-gradient(115deg,transparent,rgba(255,255,255,.5),transparent)]"
                  style={{
                    animation: "gnars-holo 3.4s ease-in-out infinite",
                    animationDelay: `${shineDelayMs}ms`,
                  }}
                />
                <span
                  aria-hidden
                  className="absolute left-2 top-2 size-5 rounded-tl-[3px] border-l-2 border-t-2 border-white/85"
                />
                <span
                  aria-hidden
                  className="absolute right-2 top-2 size-5 rounded-tr-[3px] border-r-2 border-t-2 border-white/85"
                />
                {!bounty.thumbnail && (
                  <span className="relative text-[62px] tracking-[0.02em] text-white/[0.16]">
                    ⌐◨-◨
                  </span>
                )}
                <span className="absolute left-1/2 top-2 -translate-x-1/2 font-mono text-[9.5px] text-white/50">
                  {bounty.serial}
                </span>
              </div>

              <div className="relative mx-[18px] mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-white/[0.08]">
                {[
                  { v: bounty.age, l: t("posted"), c: "text-white" },
                  { v: bounty.chain, l: t("chain"), c: "text-white" },
                  { v: bounty.usd, l: t("usd"), c: "text-[#4ade80]" },
                ].map((cell) => (
                  <div key={cell.l} className="bg-[#151515] px-1.5 py-2.5 text-center">
                    <span className={cn("block truncate text-[13px] font-bold", cell.c)}>
                      {cell.v}
                    </span>
                    <span className="block text-[9px] tracking-[0.08em] text-neutral-500">
                      {cell.l}
                    </span>
                  </div>
                ))}
              </div>

              <div className="relative mt-auto flex flex-wrap items-center gap-1.5 px-[18px] pb-4 pt-3">
                {bounty.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/[0.12] px-2.5 py-1 text-[10.5px] font-semibold text-neutral-300"
                  >
                    {tag}
                  </span>
                ))}
                {/* Only the focused card can flip, so only it advertises it. */}
                {featured && (
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                    {tBack("flipHint")}
                  </span>
                )}
              </div>
            </button>
          </Face>
        </div>

        {/* ── Back ──────────────────────────────────────────── */}
        <div
          className={cn(
            "backface-hidden rotate-y-180 absolute inset-0",
            !flipped && "pointer-events-none",
          )}
          aria-hidden={!flipped}
        >
          <Face color={color} featured={featured} className="gap-3 px-[18px] py-4">
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-[10px] font-bold tracking-[0.08em]" style={{ color }}>
                {bounty.code}
              </span>
              <span className="font-mono text-[10px] text-neutral-500">{bounty.serial}</span>
            </div>

            <h3 className="line-clamp-2 text-[14.5px] font-extrabold leading-[1.25] text-white">
              {bounty.title}
            </h3>

            <p className="line-clamp-6 flex-1 text-[11.5px] leading-[1.55] text-neutral-400">
              {bounty.description || tBack("noDescription")}
            </p>

            <dl className="flex flex-col gap-1.5 text-[11px]">
              {[
                { k: tBack("reward"), v: `${bounty.eth} ETH · ${bounty.usd}` },
                { k: tBack("issuer"), v: bounty.issuer },
                { k: tBack("deadline"), v: bounty.deadline ?? tBack("noDeadline") },
                { k: tBack("claims"), v: String(bounty.claims) },
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-1.5"
                >
                  <dt className="shrink-0 uppercase tracking-[0.08em] text-neutral-500">{row.k}</dt>
                  <dd className="truncate font-mono text-neutral-200">{row.v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex items-center gap-2">
              <Link
                href={bounty.href}
                tabIndex={flipped ? 0 : -1}
                className="flex-1 rounded-lg py-2 text-center text-[12px] font-bold text-neutral-900"
                style={{ background: color }}
              >
                {tBack("view")}
              </Link>
              <button
                type="button"
                onClick={onFlipBack}
                tabIndex={flipped ? 0 : -1}
                className="rounded-lg border border-white/[0.14] px-3 py-2 text-[12px] font-semibold text-neutral-300 hover:text-neutral-50"
              >
                {tBack("flipBack")}
              </button>
            </div>
          </Face>
        </div>
      </div>
    </div>
  );
}
