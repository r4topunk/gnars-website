"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

export type Rarity = "legendary" | "epic" | "rare" | "uncommon" | "common";

/** Tier colour. Drives the border, the foil tint, the reward glow and the seal ring. */
export const RARITY_COLOR: Record<Rarity, string> = {
  legendary: "#f7c948",
  epic: "#a78bfa",
  rare: "#60a5fa",
  uncommon: "#4ade80",
  common: "#9ca3af",
};

/** Art-frame ground per tier — a dark base the rarity glows sit on top of. */
const RARITY_ART_BG: Record<Rarity, string> = {
  legendary: "linear-gradient(160deg,#0c2a3d,#041018)",
  epic: "linear-gradient(160deg,#2a1b3d,#120c1a)",
  rare: "linear-gradient(160deg,#0d2340,#04101f)",
  uncommon: "linear-gradient(160deg,#0e2c1c,#06120c)",
  common: "linear-gradient(160deg,#26262b,#101013)",
};

export interface FanCard {
  id: string;
  code: string;
  category: string;
  title: string;
  description: string;
  /** Reward, already formatted to 4dp. */
  eth: string;
  usd: string;
  age: string;
  chain: string;
  status: string;
  statusTone: "open" | "voting" | "closed";
  serial: string;
  rarity: Rarity;
  /** The bounty on poidh.xyz — where a claim is actually submitted. */
  poidhUrl: string;
  /** The bounty on this site. */
  href: string;
}

// Card box and fan geometry. These are the reference's numbers: a 272×452 card
// tucked 96px under its neighbour puts the six-card hand at exactly 1152px, the
// shell's max width, so the fan fills the panel without a scrollbar.
const CARD_W = 272;
const CARD_H = 452;
const OVERLAP = 96;
const SPREAD_DEG = 9;
/** Per-index shift that keeps the selected card over the panel's centre line. */
const RECENTRE_PX = 150;

const STATUS_COLOR: Record<FanCard["statusTone"], string> = {
  open: "#4ade80",
  voting: "#facc15",
  closed: "#9ca3af",
};

const MONO = "var(--font-geist-mono), monospace";

/**
 * The round poidh authenticity sticker.
 *
 * `isolation:isolate` and the translateZ are load-bearing, not cargo cult: the
 * blend-mode layers below composite against the nearest stacking context, and
 * without one of their own they escape the border-radius and paint square
 * corners over the card. The sweep gets a circular mask for the same reason.
 */
function PoidhSeal({ color, delay }: { color: string; delay: number }) {
  return (
    <span
      title="poidh — pics or it didn't happen"
      className="relative flex size-[42px] shrink-0 items-center justify-center overflow-hidden rounded-full [isolation:isolate] [transform:translateZ(0)]"
      style={{
        background:
          "radial-gradient(circle at 32% 26%,#f2f2f5,#c9c9d2 38%,#9d9da8 62%,#c4c4cd 82%,#8f8f9a),conic-gradient(from 0deg,#dcdce2,#b9b9c2,#e8e8ee,#a8a8b2,#dcdce2)",
        border: "1px solid rgba(255,255,255,.65)",
        boxShadow: `0 1px 4px rgba(0,0,0,.6),0 0 14px ${color}59,inset 0 1px 1px rgba(255,255,255,.85),inset 0 -1px 2px rgba(0,0,0,.25)`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          mixBlendMode: "color-dodge",
          opacity: 0.9,
          background:
            "radial-gradient(circle at 30% 25%,rgba(255,255,255,.55),transparent 42%),conic-gradient(from 40deg,rgba(255,60,140,.75) 0deg,rgba(255,180,60,.7) 55deg,rgba(120,255,140,.65) 115deg,rgba(60,210,255,.75) 175deg,rgba(150,110,255,.7) 235deg,rgba(255,90,200,.7) 295deg,rgba(255,60,140,.75) 360deg)",
          animation: "bounty-seal 3.2s linear infinite",
          animationDelay: `${delay}s`,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          mixBlendMode: "overlay",
          opacity: 0.5,
          background:
            "repeating-linear-gradient(115deg,rgba(255,255,255,.35) 0 1px,transparent 1px 3px),repeating-linear-gradient(25deg,rgba(0,0,0,.2) 0 1px,transparent 1px 4px)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
        style={{
          maskImage: "radial-gradient(circle at 50% 50%,#fff 98%,transparent 100%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%,#fff 98%,transparent 100%)",
        }}
      >
        <span
          className="absolute left-0 top-[-30%] h-[160%] w-[45%]"
          style={{
            mixBlendMode: "screen",
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent)",
            animation: "bounty-seal-sweep 2.6s ease-in-out infinite",
            animationDelay: `${delay + 0.5}s`,
          }}
        />
      </span>
      <span
        aria-hidden
        className="absolute left-1/2 top-1.5 whitespace-nowrap text-[4.5px] font-bold tracking-[.14em]"
        style={{ transform: "translateX(-50%) rotate(-9deg)", color: "rgba(90,90,100,.75)" }}
      >
        ORIGINAL
      </span>
      <span
        className="relative text-[9px] font-black tracking-[.05em]"
        style={{
          transform: "rotate(-12deg)",
          color: "#d8434b",
          textShadow: "0 0 3px rgba(255,255,255,.9),0 1px 1px rgba(0,0,0,.25)",
        }}
      >
        poidh
      </span>
      <span
        aria-hidden
        className="absolute bottom-[5px] left-1/2 whitespace-nowrap text-[4.5px] font-bold tracking-[.14em]"
        style={{ transform: "translateX(-50%) rotate(8deg)", color: "rgba(90,90,100,.75)" }}
      >
        ORIGINAL
      </span>
    </span>
  );
}

/**
 * One card: front and back as siblings inside a preserve-3d flipper.
 *
 * The raised/rest difference is carried entirely by box-shadow rings rather than
 * by swapping `border-color`. React reconciles the style object wholesale, and a
 * border shorthand that a hover state also touches ends up pinned to whichever
 * value rendered last — the ring survives both.
 */
function Card({
  card,
  index,
  raised,
  flipped,
  onPick,
}: {
  card: FanCard;
  index: number;
  raised: boolean;
  flipped: boolean;
  onPick: () => void;
}) {
  const t = useTranslations("newhome.bounties");
  const color = RARITY_COLOR[card.rarity];
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const face: React.CSSProperties = {
    background: `radial-gradient(110% 45% at 50% 0%,${color}1c,transparent 60%),linear-gradient(180deg,#1b1b1b,#0e0e0e)`,
    border: `1px solid ${color}40`,
    boxShadow: raised
      ? `inset 0 0 0 1px ${color}aa,0 0 0 1px ${color}55,0 0 44px ${color}4d,0 20px 40px rgba(0,0,0,.6)`
      : `0 0 0 1px ${color}22,0 0 16px ${color}20,0 20px 40px rgba(0,0,0,.6)`,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
  };

  const holo: React.CSSProperties = {
    background: `linear-gradient(115deg,transparent 35%,${color}2e 48%,transparent 62%)`,
    mixBlendMode: "screen",
  };

  return (
    <div
      onClick={onPick}
      className="relative h-full w-full cursor-pointer [transform-style:preserve-3d]"
      style={{
        transform: `rotateY(${raised && flipped ? 180 : 0}deg)`,
        transition: "transform .55s cubic-bezier(.4,.1,.2,1)",
      }}
    >
      {/* ── Front ─────────────────────────────────────────── */}
      <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl" style={face}>
        <span aria-hidden className="pointer-events-none absolute inset-0" style={holo} />

        <div className="relative flex flex-col gap-[11px] px-[18px] pt-[17px]">
          <div className="flex items-baseline justify-between gap-2.5">
            <span
              className="text-[10.5px] font-bold tracking-[.08em]"
              style={{ fontFamily: MONO, color }}
            >
              {card.code}
            </span>
            <span
              aria-hidden
              className="whitespace-nowrap text-[17px] tracking-[.02em] text-white/45"
              style={{ textShadow: `0 0 12px ${color}55` }}
            >
              ⌐◨-◨
            </span>
          </div>

          <div>
            <h3 className="m-0 line-clamp-2 min-h-10 text-pretty text-[15.5px] font-extrabold leading-[1.28] text-white">
              {card.title}
            </h3>
            <p className="mt-[5px] text-[11px] text-neutral-400">
              {card.category} · {t("card.type")}
            </p>
          </div>

          <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-white/10">
            <div className="bg-black/35 px-3 py-2">
              <span className="block text-[9.5px] font-bold tracking-[.1em] text-[#8a8a8a]">
                {t("card.class")}
              </span>
              <span className="block text-[13.5px] font-bold" style={{ color }}>
                {t(`rarity.${card.rarity}`)}
              </span>
            </div>
            <div className="border-l border-white/[0.08] bg-black/35 px-3 py-2">
              <span className="block text-[9.5px] font-bold tracking-[.1em] text-[#8a8a8a]">
                {t("card.status")}
              </span>
              <span
                className="block text-[13.5px] font-bold"
                style={{ color: STATUS_COLOR[card.statusTone] }}
              >
                {card.status}
              </span>
            </div>
          </div>
        </div>

        {/* Foil art frame — the reward is the subject, not a caption under one. */}
        <div
          className="relative mx-[18px] mt-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[10px]"
          style={{
            background: `radial-gradient(120% 95% at 72% 16%,${color}38,transparent 55%),radial-gradient(95% 75% at 18% 88%,${color}26,transparent 58%),${RARITY_ART_BG[card.rarity]}`,
            border: `1px solid ${color}55`,
            boxShadow: `inset 0 0 0 1px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.14),inset 0 0 34px ${color}22`,
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              mixBlendMode: "screen",
              opacity: 0.75,
              background: `conic-gradient(from 205deg at 50% 45%,transparent 0deg,${color}30 38deg,transparent 82deg,rgba(255,255,255,.09) 120deg,transparent 158deg,${color}24 214deg,transparent 256deg,rgba(255,255,255,.07) 306deg,transparent 360deg)`,
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              mixBlendMode: "screen",
              animation: "bounty-twinkle 2.8s ease-in-out infinite",
              animationDelay: `${index * 0.4}s`,
              background:
                "radial-gradient(circle 8px at 78% 30%,rgba(255,255,255,.4),transparent),radial-gradient(circle 1.7px at 78% 30%,#fff 99%,transparent),radial-gradient(circle 1.2px at 24% 22%,rgba(255,255,255,.95) 99%,transparent),radial-gradient(circle 6px at 30% 76%,rgba(255,255,255,.3),transparent),radial-gradient(circle 1.5px at 30% 76%,#fff 99%,transparent),radial-gradient(circle 1px at 62% 64%,rgba(255,255,255,.85) 99%,transparent),radial-gradient(circle 1px at 12% 52%,rgba(255,255,255,.7) 99%,transparent),radial-gradient(circle 1.3px at 88% 78%,rgba(255,255,255,.8) 99%,transparent)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-[-30%] top-[-20%] h-[140%] w-[60%]"
            style={{
              background: "linear-gradient(115deg,transparent,rgba(255,255,255,.5),transparent)",
              animation: "bounty-holo 3.4s ease-in-out infinite",
              animationDelay: `${index * 0.5}s`,
            }}
          />
          <span
            aria-hidden
            className="absolute left-2 top-2 size-5 rounded-[3px_0_0_0] border-l-2 border-t-2 border-white/85"
          />
          <span
            aria-hidden
            className="absolute right-2 top-2 size-5 rounded-[0_3px_0_0] border-r-2 border-t-2 border-white/85"
          />

          <span
            className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full px-[13px] py-0.5 text-[9px] font-bold tracking-[.06em]"
            style={{
              fontFamily: MONO,
              border: `1px solid ${color}66`,
              background: "rgba(0,0,0,.55)",
              color,
            }}
          >
            {card.serial}
          </span>

          <span className="relative flex flex-col items-center gap-0.5">
            <span
              className="text-[34px] font-extrabold text-white"
              style={{
                fontFamily: MONO,
                textShadow: `0 0 26px ${color}88,0 2px 10px rgba(0,0,0,.7)`,
              }}
            >
              {card.eth}
            </span>
            <span
              className="text-[11px] font-bold tracking-[.3em] text-white/60"
              style={{ fontFamily: MONO }}
            >
              ETH
            </span>
            <span
              className="text-[11.5px] font-semibold text-[#4ade80]"
              style={{ fontFamily: MONO, textShadow: "0 1px 6px rgba(0,0,0,.7)" }}
            >
              ({card.usd})
            </span>
          </span>

          <span
            className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8.5px] tracking-[.14em] text-white/55 transition-opacity duration-300"
            style={{ fontFamily: MONO, opacity: raised ? 1 : 0 }}
          >
            {t("card.tapToFlip")}
          </span>
        </div>

        <div className="relative mx-[18px] mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-white/[0.08]">
          {[
            { v: card.age, l: t("card.posted"), c: "#fff" },
            { v: card.chain, l: t("card.chain"), c: "#fff" },
            { v: card.usd, l: t("card.usd"), c: "#4ade80" },
          ].map((cell) => (
            <div key={cell.l} className="bg-[#151515] px-1.5 py-[9px] text-center">
              <span className="block text-[13px] font-bold" style={{ color: cell.c }}>
                {cell.v}
              </span>
              <span className="block text-[9px] tracking-[.08em] text-[#8a8a8a]">{cell.l}</span>
            </div>
          ))}
        </div>

        <div className="relative flex items-center justify-between gap-1.5 px-[18px] pb-3 pt-2.5">
          <span className="text-[9px] tracking-[.12em] text-white/40" style={{ fontFamily: MONO }}>
            {card.serial}
          </span>
          <PoidhSeal color={color} delay={index * 0.35} />
        </div>
      </div>

      {/* ── Back ──────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl"
        style={{ ...face, transform: "rotateY(180deg)" }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0" style={holo} />
        <div className="relative flex h-full flex-col gap-3 px-[18px] pb-4 pt-5">
          <div className="flex items-center justify-between">
            <Image
              src="/poidh-logo.png"
              alt="poidh"
              width={26}
              height={26}
              className="h-[26px] w-auto rounded-md shadow-[0_2px_8px_rgba(0,0,0,.6)]"
            />
            <span
              className="text-[10px] font-bold tracking-[.08em]"
              style={{ fontFamily: MONO, color }}
            >
              {card.code}
            </span>
          </div>

          {/* The brief gets the whole middle of the card. It used to share the
              space with a four-step "how bounties work" box that was identical
              on all six cards, so the one thing that differs between them was
              the thing being cut off mid-sentence.

              Long briefs scroll rather than truncate, and the mask fades the
              last few lines out instead of slicing a row of glyphs in half —
              which is what makes it read as "there is more" rather than as a
              rendering fault. */}
          <div className="flex min-h-0 flex-1 flex-col">
            <span className="block shrink-0 text-[9.5px] font-bold tracking-[.12em] text-[#8a8a8a]">
              {t("back.challenge")}
            </span>
            <div
              onClick={stop}
              className="mt-[5px] min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar]:w-1"
              style={{
                maskImage: "linear-gradient(to bottom,#000 calc(100% - 26px),transparent)",
                WebkitMaskImage: "linear-gradient(to bottom,#000 calc(100% - 26px),transparent)",
              }}
            >
              <p className="text-pretty whitespace-pre-line pb-6 text-[12.5px] leading-[1.55] text-neutral-200">
                {card.description || t("back.noDescription")}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-[9px] border border-white/10 bg-black/35 px-3 py-[9px]">
            <span className="text-[10px] tracking-[.08em] text-[#8a8a8a]">{t("back.reward")}</span>
            <span className="text-[15px] font-extrabold text-white" style={{ fontFamily: MONO }}>
              {card.eth} ETH{" "}
              <span className="text-[10.5px] font-semibold text-[#4ade80]">{card.usd}</span>
            </span>
          </div>

          <div className="flex flex-col gap-[7px]">
            <a
              href={card.poidhUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
              className="block rounded-lg bg-neutral-50 py-2.5 text-center text-[12.5px] font-bold text-neutral-900 hover:opacity-90"
            >
              {t("back.submitClaim")}
            </a>
            <Link
              href={card.href}
              onClick={stop}
              className="block rounded-lg border border-white/[0.14] bg-white/[0.04] py-[9px] text-center text-xs font-semibold text-neutral-50 hover:bg-neutral-800"
            >
              {t("back.view")}
            </Link>
          </div>

          <span className="text-center text-[9px] text-white/40" style={{ fontFamily: MONO }}>
            {card.serial} · {t("back.tapToFlipBack")}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * The hand.
 *
 * Six rarity-tiered cards fanned around whichever one is selected, with the row
 * counter-shifted so the raised card always sits on the panel's centre line.
 * Clicking a side card re-deals around it; clicking the raised card turns it
 * over. Below 769px the fan is meaningless on a phone-width viewport, so the
 * same cards render upright in a snap-scroll row — the flip still works there.
 */
export function BountyCardFan({ cards }: { cards: FanCard[] }) {
  const t = useTranslations("newhome.bounties");
  // The Legendary is dealt to index 2, so that is where the hand opens.
  const [idx, setIdx] = useState(2);
  /**
   * Card id rather than index: the poidh query refreshes on an interval and
   * re-deals the hand, and an index would leave a different bounty flipped open.
   */
  const [flippedId, setFlippedId] = useState<string | null>(null);

  // …and can return a shorter hand than the one that is on screen.
  useEffect(() => {
    setIdx((current) => Math.min(current, Math.max(0, cards.length - 1)));
  }, [cards.length]);

  const active = cards.length > 0 ? Math.min(idx, cards.length - 1) : 0;

  const toggleFlip = useCallback((id: string) => {
    setFlippedId((current) => (current === id ? null : id));
  }, []);

  /**
   * Two-stage, but only where the stages mean something. In the fan a card that
   * is not raised is rotated away and half-covered, so the first click brings it
   * forward to be read and only a second click turns it over.
   *
   * The branch reads `active` from render scope rather than from inside a
   * `setIdx` updater. An updater has to be pure — StrictMode runs it twice, and
   * a `setFlippedId` nested in there fired twice per click and cancelled itself,
   * so the fan's second click did nothing.
   */
  const pickFan = useCallback(
    (i: number, id: string) => {
      if (i === active) {
        toggleFlip(id);
        return;
      }
      setIdx(i);
      setFlippedId(null);
    },
    [active, toggleFlip],
  );

  // Escape closes the back, the same way a second tap does.
  useEffect(() => {
    if (!flippedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFlippedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flippedId]);

  if (cards.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-neutral-500">
        {t("empty")}
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-[22px] border border-white/[0.07] px-4 pb-10 pt-[34px] sm:px-6"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 8%,rgba(120,70,20,.22),rgba(0,0,0,0) 62%),#060606",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "repeating-linear-gradient(rgba(255,255,255,.03) 0 1px,transparent 1px 42px),repeating-linear-gradient(90deg,rgba(255,255,255,.03) 0 1px,transparent 1px 42px)",
        }}
      />

      {/* Header. The tall bottom margin is what keeps the raised card, which
          rises 30px out of the row, from colliding with the legend. */}
      <div className="relative mb-8 flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 min-[769px]:mb-[84px]">
        <div className="flex flex-wrap items-center">
          {cards.map((card, i) => (
            <button
              key={card.id}
              type="button"
              onClick={() => pickFan(i, card.id)}
              aria-label={`${card.code} — ${card.title}`}
              aria-pressed={i === active}
              className="flex cursor-pointer items-center gap-[7px] border-0 border-l border-white/[0.15] bg-transparent px-3 py-1.5 text-xs font-bold tracking-[.06em] hover:text-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c948]/60"
              style={{ fontFamily: MONO, color: i === active ? "#fafafa" : "#a3a3a3" }}
            >
              <span
                aria-hidden
                className="size-[7px] shrink-0 rounded-full"
                style={{
                  background: RARITY_COLOR[card.rarity],
                  boxShadow: `0 0 6px ${RARITY_COLOR[card.rarity]}`,
                }}
              />
              {card.code}
            </button>
          ))}
        </div>
        <Link
          href="/community/bounties"
          className="whitespace-nowrap text-[13px] font-semibold text-neutral-300 hover:text-neutral-50"
        >
          {t("viewAll")}
        </Link>
      </div>

      {/* ── Fan, 769px and up ─────────────────────────────── */}
      <div
        // The outermost cards drop ~103px below the row (|off|^1.25 × 26) and
        // rotation swings their corners further still, so the row reserves the
        // arc's depth. Without it the panel's overflow clip sliced their feet
        // off along the bottom edge.
        className="relative hidden items-start justify-center pb-[140px] pt-5 min-[769px]:flex"
        style={{
          transform: `translateX(${(2.5 - active) * RECENTRE_PX}px)`,
          transition: "transform .3s",
        }}
      >
        {cards.map((card, i) => {
          const off = i - active;
          const a = Math.abs(off);
          const raised = off === 0;
          return (
            <div
              key={card.id}
              className="relative shrink-0"
              style={{
                width: CARD_W,
                height: CARD_H,
                marginLeft: i === 0 ? 0 : -OVERLAP,
                perspective: 1400,
                transform: `rotate(${off * SPREAD_DEG}deg) translateY(${
                  raised ? -30 : Math.pow(a, 1.25) * 26
                }px) scale(${raised ? 1.07 : Math.max(0.82, 0.95 - a * 0.05)})`,
                transformOrigin: "50% 130%",
                filter: raised
                  ? "brightness(1)"
                  : `brightness(${Math.max(0.5, 0.82 - a * 0.1)}) saturate(.85)`,
                zIndex: raised ? 20 : 10 - a,
                transition: "transform .3s,filter .3s",
              }}
            >
              <Card
                card={card}
                index={i}
                raised={raised}
                flipped={raised && flippedId === card.id}
                onPick={() => pickFan(i, card.id)}
              />
            </div>
          );
        })}
      </div>

      {/* ── Snap row, 768px and below ─────────────────────── */}
      <div className="relative -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 min-[769px]:hidden">
        {cards.map((card, i) => (
          <div
            key={card.id}
            className="relative shrink-0 snap-center"
            style={{ width: CARD_W, height: CARD_H, perspective: 1400 }}
          >
            {/* No fan to focus into at this width: every card is already
                upright and readable, so the first tap flips straight to the
                brief instead of selecting a card that looks no different. */}
            <Card
              card={card}
              index={i}
              raised={flippedId === card.id || i === active}
              flipped={flippedId === card.id}
              onPick={() => toggleFlip(card.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
