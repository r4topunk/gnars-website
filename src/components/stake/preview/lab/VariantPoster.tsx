"use client";

// Design-lab variant B — POSTER OVERLAY.
//
// The problem this answers: at desktop the shipped RiderSelect is a tall 4:5
// stage next to a right column holding four short lines, so most of the column
// is empty field. This variant deletes the column instead of trying to fill it.
//
//   RiderSelect (current)              VariantPoster (here)
//   ────────────────────────────────   ──────────────────────────────────────
//   4:5 stage + right text column      one 16:9 art card, info laid over it
//   empty right field                  empty space is art breathing room
//   roster row below, 4:5 tiles        face chips on the card's bottom edge
//
// Everything real is reused: CHARACTERS from the production selector, the
// stake.* copy keys, and useVaultTotal for the backing line. Nothing here is
// imported by /stake or /stake/preview.
import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  GOLD,
  GOLD_CTA,
  GOLD_INK,
  GOLD_SOLID,
  MICRO,
  MUTED,
  PRESS,
} from "@/components/stake/preview/preview-config";
import { Button } from "@/components/ui/button";
import { useVaultTotal } from "@/hooks/use-vault-total";
import { getRider } from "@/lib/gnars-vaults";
import { cn } from "@/lib/utils";
import { CHARACTERS } from "../../CharacterSelector";

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;

// The stage is the one place a gradient is allowed, so the card owns two: the
// base field and the left-to-transparent scrim that buys the overlay type its
// legibility. Both are flat colour ramps, no glow.
const FIELD =
  "radial-gradient(90% 120% at 72% 42%, rgba(245,140,30,.18) 0%, rgba(245,140,30,0) 58%), linear-gradient(180deg,#161210,#0b0907)";
const SCRIM =
  "linear-gradient(90deg,#0b0907 0%,rgba(11,9,7,.94) 34%,rgba(11,9,7,.72) 52%,rgba(11,9,7,0) 76%)";

export default function VariantPoster() {
  const t = useTranslations("stake");
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  const active = CHARACTERS[index];
  const name = t(`characters.${active.id}.name`);
  const tagline = t(`characters.${active.id}.tagline`);

  const vault = getRider(active.id)?.vault;
  const staked = useVaultTotal(vault);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08]"
      style={{ background: FIELD }}
    >
      {/* Art block. It is what gives the card its height at every breakpoint;
          the plate and the chip strip lift out of the flow at md and sit on top
          of it. Portrait crop on mobile, landscape poster from md up. */}
      <div className="relative aspect-[4/5] w-full sm:aspect-[3/2] md:aspect-[16/9]">
        {/* Mobile keeps the cut-out centred. From md the art slides into the
            right two-thirds so the left third is clean field for the type. */}
        <div className="absolute inset-x-[6%] inset-y-[5%] md:left-[34%] md:right-[3%] md:inset-y-[6%]">
          <Image
            key={active.id}
            src={active.image}
            alt={name}
            fill
            priority
            unoptimized
            sizes="(max-width: 768px) 90vw, 44rem"
            className="object-contain object-bottom drop-shadow-[0_24px_34px_rgba(0,0,0,0.5)]"
          />
        </div>

        {/* The clip is multi-MB, so the <video> only exists while the pointer is
            on the card. Landscape footage in a landscape frame is the one place
            it can play uncropped, which is part of what this variant is
            arguing for. */}
        {hovered && active.video && (
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
            <video
              src={active.video}
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* Scrim: desktop only. On mobile the plate sits below the art, so
            nothing needs protecting and a gradient over the face is just haze. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{ backgroundImage: SCRIM }}
        />
      </div>

      {/* Plate. One instance: in flow under the art on mobile, absolutely
          placed over the scrim from md up. No duplicated markup, so the two
          layouts can never say different things. */}
      <div
        className={cn(
          "flex flex-col gap-3 px-4 pb-4",
          "md:absolute md:inset-y-0 md:left-0 md:w-[54%] md:justify-center md:px-8 md:pb-24 md:pt-8",
        )}
      >
        <div className="space-y-2">
          <h2 className="text-3xl font-black leading-[0.95] tracking-tight text-white md:text-5xl">
            {name}
          </h2>
          <p className={cn("text-sm md:max-w-[30ch] md:text-base", MUTED)}>{tagline}</p>
        </div>

        <p className={cn("font-mono text-sm", MUTED)}>
          {!vault ? (
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

        <div className="pt-1">
          <Button
            onClick={() => {}}
            className={cn(GOLD_CTA, "w-full px-6 md:w-auto")}
            style={{ backgroundImage: GOLD, color: GOLD_INK }}
          >
            {t("stakeCta", { name })}
          </Button>
        </div>
      </div>

      {/* Roster. Face chips, circular, on the card's bottom edge inside the
          scrim's protected band. They are the only place the other riders
          appear, so the strip carries a name for the active one and nothing
          else: seven labels under seven faces would rebuild the grid this
          variant is trying to delete. */}
      <div
        className={cn("px-4 pb-4", "md:absolute md:bottom-0 md:left-0 md:w-[54%] md:px-8 md:pb-7")}
      >
        <div
          role="group"
          aria-label="Rider roster"
          className="-mx-1 flex snap-x items-center gap-2.5 overflow-x-auto px-1 pb-1 sm:gap-3"
        >
          {CHARACTERS.map((c, i) => {
            const isActive = i === index;
            const chipName = t(`characters.${c.id}.name`);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={isActive}
                aria-label={chipName}
                title={chipName}
                className={cn(
                  "size-11 shrink-0 cursor-pointer snap-start rounded-full bg-white/[0.06] sm:size-12",
                  "transition-opacity",
                  PRESS,
                  isActive
                    ? "opacity-100 ring-2 ring-[#f7c948] ring-offset-2 ring-offset-[#0b0907]"
                    : "opacity-55 hover:opacity-100",
                )}
                style={{
                  backgroundImage: `url("${c.image}")`,
                  backgroundSize: c.face.size,
                  backgroundPosition: c.face.pos,
                  backgroundRepeat: "no-repeat",
                }}
              />
            );
          })}
        </div>
        <p className={cn("mt-2 font-mono text-xs", MICRO)}>
          {index + 1} / {CHARACTERS.length}
        </p>
      </div>
    </div>
  );
}
