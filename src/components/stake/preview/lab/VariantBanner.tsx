"use client";

// Design-lab variant C — DENSE BANNER.
//
// The arm that asks "do we need the big stage at all?". There is no 4:5 stage
// here: the only art is a square face crop (the same zoom data the roster tiles
// use), so the selected rider, the claim about them and the CTA all sit on one
// short band. Dead air is structurally impossible — the panel is only as tall as
// its densest zone, and the roster lives inside the same panel under a hairline.
//
// Self-contained on purpose: no props, owns its own selection, and the CTA is a
// no-op because the lab judges layout, not flow.
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  GOLD,
  GOLD_CTA,
  GOLD_INK,
  GOLD_SOLID,
  MICRO,
  MUTED,
  PANEL,
} from "@/components/stake/preview/preview-config";
import { Button } from "@/components/ui/button";
import { useVaultTotal } from "@/hooks/use-vault-total";
import { getRider } from "@/lib/gnars-vaults";
import { cn } from "@/lib/utils";
import { CHARACTERS } from "../../CharacterSelector";

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;

/** Face crop shared by the hero zone and the roster tiles — one recipe, two sizes. */
function faceStyle(image: string, size: string, pos: string) {
  return {
    backgroundImage: `url("${image}")`,
    backgroundSize: size,
    backgroundPosition: pos,
    backgroundRepeat: "no-repeat",
  } as const;
}

export default function VariantBanner() {
  const t = useTranslations("stake");
  const [index, setIndex] = useState(0);

  const count = CHARACTERS.length;
  const active = CHARACTERS[index];
  const name = t(`characters.${active.id}.name`);
  const tagline = t(`characters.${active.id}.tagline`);

  const vault = getRider(active.id)?.vault;
  const staked = useVaultTotal(vault);

  const go = (next: number) => setIndex((next + count) % count);

  return (
    <div className={cn(PANEL, "overflow-hidden")}>
      {/* Zone row: face crop · identity · CTA. On mobile the CTA drops under the
          identity block; the face stays beside the text so the band never grows
          into a stage. */}
      <div className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:gap-6 sm:p-6">
        <span
          aria-hidden
          className="h-24 w-24 shrink-0 rounded-2xl bg-white/[0.04] sm:h-36 sm:w-36"
          style={faceStyle(active.image, active.face.size, active.face.pos)}
        />

        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl">
            {name}
          </h2>
          <p className={cn("text-sm", MUTED)}>{tagline}</p>
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
        </div>

        <Button
          onClick={() => {}}
          className={cn(GOLD_CTA, "w-full shrink-0 sm:w-auto sm:px-6")}
          style={{ backgroundImage: GOLD, color: GOLD_INK }}
        >
          {t("stakeCta", { name })}
        </Button>
      </div>

      {/* Same panel, one hairline: the roster is part of the banner, not a second
          surface below it. */}
      <div className="border-t border-white/[0.06] px-4 py-3 sm:px-6">
        <div
          role="group"
          aria-label="Riders"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") go(index - 1);
            if (e.key === "ArrowRight") go(index + 1);
          }}
          className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 sm:gap-3"
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
                  "w-14 shrink-0 cursor-pointer snap-start text-left transition-opacity sm:w-16",
                  isActive ? "opacity-100" : "opacity-55 hover:opacity-100",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "block aspect-square rounded-lg bg-white/[0.04]",
                    isActive && "ring-2 ring-[#f7c948]",
                  )}
                  style={faceStyle(c.image, c.face.size, c.face.pos)}
                />
                <span
                  className={cn(
                    "mt-1 block truncate text-xs",
                    isActive ? "font-semibold text-white" : MUTED,
                  )}
                >
                  {t(`characters.${c.id}.name`)}
                </span>
              </button>
            );
          })}
        </div>
        <p className={cn("mt-2 font-mono text-xs", MICRO)}>
          {index + 1} / {count}
        </p>
      </div>
    </div>
  );
}
