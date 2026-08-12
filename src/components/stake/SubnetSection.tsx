"use client";

// The Morpheus subnet pitch, moved out of a floating green circle with no label
// and into a section at the end of the page.
//
// useGnarsSubnet resolves totalStaked BEFORE it bails on a missing wallet, so the
// goal bar paints for a disconnected visitor — this section works cold.
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
// The milestone ladder is what Gnars DELIVERS to amplify Morpheus as the subnet
// grows — not what a staker earns. See src/lib/stake-milestones.ts for why the
// distinction matters and why only the 10k anchor reads as `committed`.
//
// SUBNET_MILESTONES is campaign DATA only (id + threshold + firmness). The copy lives in
// `stake.page.subnet.milestones.<id>` so the checklist speaks the page's language
// — it used to print English in the middle of a Portuguese section — and the
// thresholds inside those labels are interpolated as `{n, number}`, so pt-BR gets
// "10.000" instead of "10,000" right under a pt-BR total.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { GnarsStakeDialog } from "@/components/stake/GnarsStakeDialog";
import { RevealItem, RevealSection } from "@/components/stake/Reveal";
import { SectionHeader } from "@/components/stake/SectionHeader";
import {
  CARD,
  CARD_PAD,
  GOLD,
  GOLD_CTA,
  GOLD_INK,
  MICRO,
  MOR_FILL,
  MOR_TEXT,
  MUTED,
} from "@/components/stake/stake-ui";
import { Button } from "@/components/ui/button";
import { useGnarsSubnet } from "@/hooks/use-gnars-subnet";
import { useUserAddress } from "@/hooks/use-user-address";
import { isMilestoneDone, SUBNET_GOAL_MOR, SUBNET_MILESTONES } from "@/lib/stake-milestones";
import { cn } from "@/lib/utils";

const fmtMor = (n: number, locale: string) =>
  n.toLocaleString(locale, { maximumFractionDigits: 0 });

export function SubnetSection() {
  const t = useTranslations("stake.page.subnet");
  const locale = useLocale();
  const { address: you } = useUserAddress();
  const { totalStaked } = useGnarsSubnet(you);
  const [open, setOpen] = useState(false);

  const pct = Math.min(100, (totalStaked / SUBNET_GOAL_MOR) * 100);

  return (
    // The section IS its own card (no wrapping island, no inner panel): header,
    // progress, milestones and CTA all sit on one surface.
    <RevealSection className={cn(CARD, CARD_PAD, "space-y-4")}>
      <RevealItem>
        <SectionHeader title={t("title")} desc={t("desc")} />
      </RevealItem>

      <RevealItem delay={50}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-mono text-lg font-bold tabular-nums">
                <span className={MOR_TEXT}>{fmtMor(totalStaked, locale)}</span>{" "}
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
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.10]">
              <div
                // ease token: EASE_OUT in src/lib/motion.ts.
                className={cn(
                  "h-full w-full origin-left rounded-full transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                  MOR_FILL,
                )}
                style={{ transform: `scaleX(${pct / 100})` }}
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

        {/* The ladder needs naming and framing before it is read: without these
            two lines it looks like a reward schedule, which is the other axis
            entirely and the one the stake dialog's disclaimer contradicts. */}
        <h3 className="mt-6 text-sm font-semibold">{t("milestonesTitle")}</h3>
        <p className={cn("mt-1 max-w-prose text-xs", MUTED)}>{t("milestonesNote")}</p>

        <ul className="mt-3 space-y-2">
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
                    done ? "bg-foreground/70" : "border border-foreground/30",
                  )}
                />
                <span className={done ? "" : MUTED}>
                  {t(`milestones.${m.id}`, { n: m.amountMor })}{" "}
                  {/* Inline rather than a right-aligned column: these labels are
                      long enough to wrap on a phone, and a pinned column would
                      squeeze them to two words a line. Not a PILL either — a pill
                      is a badge about the page, never the state a row is in. */}
                  <span
                    className={cn(
                      "whitespace-nowrap text-[10px] font-semibold tracking-wide uppercase",
                      MICRO,
                    )}
                  >
                    · {t(`firmness.${m.firmness}`)}
                  </span>
                </span>
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
