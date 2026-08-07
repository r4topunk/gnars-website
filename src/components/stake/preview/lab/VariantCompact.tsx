"use client";

// Design-lab variant A — COMPACT SPLIT.
//
// The judge question: does the shipped concept survive if we just compress it?
// Same two-column idea as RiderSelect, but every pixel has to be earned:
//
//   RiderSelect (today)                 here
//   ─────────────────────────────────   ─────────────────────────────────────
//   4:5 stage at ~40% of the width      3:4 face-forward crop, fixed 13rem
//   right column: 3 lines + CTA         right column: head + data band + CTA
//   right column floats in dead air     column is vertically centred as a group
//   roster is a separate block          roster lives inside the same panel
//   ~700px tall at 1280                 ~450px tall at 1280
//
// The stage uses each character's `face` zoom (the same numbers the roster tiles
// use) instead of the full-body cut-out: at a third of the width a full body is
// 300px of empty shoulders, and the face is what tells riders apart.
//
// Data band rule: only claims that are true. Backing is live from the vault,
// terms are the venue the spec already commits to, status is vault presence.
// The THPS stat block stays dead — placeholder numbers drawn as measurement.
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

/** One cell of the data band. Value slot takes a node so the backing cell can
 *  swap a gold number for a muted loading/empty string without a second layout. */
function Cell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 px-4 first:pl-0", className)}>
      <p className={cn("truncate text-xs", MICRO)}>{label}</p>
      <div className="mt-1 truncate font-mono text-sm text-white">{children}</div>
    </div>
  );
}

export default function VariantCompact() {
  const t = useTranslations("stake");
  const tr = useTranslations("stake.preview.rider");

  const [index, setIndex] = useState(0);
  const active = CHARACTERS[index];
  const name = t(`characters.${active.id}.name`);
  const tagline = t(`characters.${active.id}.tagline`);

  const rider = getRider(active.id);
  const hasVault = Boolean(rider?.vault);
  const staked = useVaultTotal(rider?.vault);

  return (
    <div className={cn(PANEL, "p-4 sm:p-6")}>
      {/*
        One grid owns the whole top half so the stage can span the right
        column's three rows and stay optically centred against them. Placement is
        explicit rather than flow-based: on mobile the head sits beside a thumb
        stage and the band/CTA drop full width underneath.
      */}
      <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-4 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-x-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        {/* Stage — tight 3:4 crop on the face, not the full cut-out */}
        <div
          role="img"
          aria-label={name}
          className="col-start-1 row-start-1 aspect-[3/4] overflow-hidden rounded-2xl border border-white/[0.08] md:row-span-3 md:self-center"
          style={{
            backgroundColor: "#100d0b",
            backgroundImage: `url("${active.image}"), radial-gradient(120% 90% at 50% 30%, rgba(245,140,30,.18) 0%, rgba(245,140,30,0) 58%)`,
            backgroundSize: `${active.face.size}, cover`,
            backgroundPosition: `${active.face.pos}, center`,
            backgroundRepeat: "no-repeat, no-repeat",
          }}
        />

        {/* Head */}
        <div className="col-start-2 row-start-1 min-w-0 self-center">
          <h2 className="truncate text-2xl font-black tracking-tight text-white lg:text-3xl">
            {name}
          </h2>
          <p className={cn("mt-1 line-clamp-2 text-sm", MUTED)}>{tagline}</p>
        </div>

        {/* Data band — three true claims, hairlines instead of sub-cards */}
        <div className="col-span-2 row-start-2 flex divide-x divide-white/[0.06] md:col-span-1 md:col-start-2">
          <Cell label="Community backing" className="basis-[40%]">
            {!hasVault ? (
              <span className={MUTED}>{t("vaultSoon")}</span>
            ) : staked === null ? (
              <span className={MUTED}>{t("loadingSupport")}</span>
            ) : (
              <span className="text-base font-bold lg:text-lg" style={{ color: GOLD_SOLID }}>
                {usd(staked)}
              </span>
            )}
          </Cell>
          <Cell label="Terms" className="basis-[32%]">
            Base · no lock
          </Cell>
          <Cell label="Vault" className="basis-[28%]">
            {hasVault ? "live" : "soon"}
          </Cell>
        </div>

        {/* CTA — sized to its label, not to the column */}
        <div className="col-span-2 row-start-3 md:col-span-1 md:col-start-2">
          <Button
            onClick={() => {}}
            className={cn(GOLD_CTA, "w-full px-6 md:w-auto")}
            style={{ backgroundImage: GOLD, color: GOLD_INK }}
          >
            {t("stakeCta", { name })}
          </Button>
        </div>
      </div>

      {/* Roster — same panel, one hairline, small enough to stay a footer */}
      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <div
          role="group"
          aria-label={tr("rosterLabel")}
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {CHARACTERS.map((c, i) => {
            const isActive = i === index;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-pressed={isActive}
                className={cn(
                  "w-12 shrink-0 cursor-pointer text-left transition-opacity",
                  isActive ? "opacity-100" : "opacity-55 hover:opacity-100",
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
          {tr("position", { current: index + 1, total: CHARACTERS.length })}
        </p>
      </div>
    </div>
  );
}
