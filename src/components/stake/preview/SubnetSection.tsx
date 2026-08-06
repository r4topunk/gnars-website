"use client";

// Prototype: the Morpheus subnet pitch, moved out of a floating green circle with
// no label and into a section at the end of the page.
//
// useGnarsSubnet resolves totalStaked BEFORE it bails on a missing wallet, so the
// goal bar paints for a disconnected reviewer — which is why this is the section
// with the most real data in the prototype, not the least.
//
// Colour rule from the spec: this is the ONLY section allowed to use Morpheus
// green, and only on the progress fill and the MOR total. The CTA is gold like
// every other primary action on the page, so "back the subnet" reads as the same
// kind of act as "back a rider" instead of a different product.
//
// The milestone dots are the page's only dots. They survive the "zero decorative
// dots" rule because they encode real state — done vs pending — rather than
// decorating a value that already carries its own unit.
//
// Milestone labels still come from SUBNET_MILESTONES in src/lib/stake-milestones.ts
// (campaign data, shared with production) — localising those is a separate change.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { GnarsStakeDialog } from "@/components/stake/GnarsStakeDialog";
import {
  GOLD,
  GOLD_CTA,
  GOLD_INK,
  MICRO,
  MOR_GREEN,
  MUTED,
  PANEL,
  PANEL_PAD,
} from "@/components/stake/preview/preview-config";
import { RevealItem, RevealSection } from "@/components/stake/preview/Reveal";
import { SectionHeader } from "@/components/stake/preview/SectionHeader";
import { Button } from "@/components/ui/button";
import { useGnarsSubnet } from "@/hooks/use-gnars-subnet";
import { useUserAddress } from "@/hooks/use-user-address";
import { isMilestoneDone, SUBNET_GOAL_MOR, SUBNET_MILESTONES } from "@/lib/stake-milestones";
import { cn } from "@/lib/utils";

const fmtMor = (n: number, locale: string) =>
  n.toLocaleString(locale, { maximumFractionDigits: 0 });

export function SubnetSection() {
  const t = useTranslations("stake.preview.subnet");
  const locale = useLocale();
  const { address: you } = useUserAddress();
  const { totalStaked } = useGnarsSubnet(you);
  const [open, setOpen] = useState(false);

  const pct = Math.min(100, (totalStaked / SUBNET_GOAL_MOR) * 100);

  return (
    <RevealSection className="space-y-4">
      <RevealItem>
        <SectionHeader title={t("title")} desc={t("desc")} />
      </RevealItem>

      <RevealItem delay={50} className={cn(PANEL, PANEL_PAD)}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-mono text-lg font-bold tabular-nums">
                <span style={{ color: MOR_GREEN }}>{fmtMor(totalStaked, locale)}</span>{" "}
                <span className={cn("text-xs font-normal", MUTED)}>{t("morStaked")}</span>
              </span>
              <span className={cn("font-mono text-xs tabular-nums", MICRO)}>
                {t("goal", { n: SUBNET_GOAL_MOR })}
              </span>
            </div>
            {/* The fill is full width and scaled, not a growing `width`: animating
                width lays out and paints on every frame, a transform does neither.
                500ms is over the UI budget on purpose — this is a value arriving
                from chain, and it should be legible as "it filled to here". */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                // ease token: EASE_OUT in src/lib/motion.ts.
                className="h-full w-full origin-left rounded-full transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
                style={{ transform: `scaleX(${pct / 100})`, backgroundColor: MOR_GREEN }}
              />
            </div>
          </div>
          <Image
            src="/logos/morpheus.webp"
            alt="Morpheus"
            width={40}
            height={40}
            className="shrink-0 rounded-full"
          />
        </div>

        <ul className="mt-5 space-y-2">
          {SUBNET_MILESTONES.map((m) => {
            const done = isMilestoneDone(m, totalStaked);
            return (
              <li key={m.id} className="flex items-start gap-2.5 text-sm">
                {/* Filled = reached, hollow = pending. Colourless on purpose: green
                    is spent on the bar and the total, and a green tick here would
                    make three different greens argue inside one panel. */}
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    done ? "bg-white/70" : "border border-white/25",
                  )}
                />
                <span className={done ? "" : MUTED}>{m.label}</span>
              </li>
            );
          })}
        </ul>

        <Button
          className={cn(GOLD_CTA, "mt-6 w-full sm:w-auto")}
          style={{ backgroundImage: GOLD, color: GOLD_INK }}
          onClick={() => setOpen(true)}
        >
          {t("cta")}
        </Button>
      </RevealItem>

      <GnarsStakeDialog open={open} onOpenChange={setOpen} />
    </RevealSection>
  );
}
