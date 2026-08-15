"use client";

// The Morpheus subnet pitch, moved out of a floating green circle with no label
// and into a section at the end of the page.
//
// useGnarsSubnet resolves totalStaked BEFORE it bails on a missing wallet, so the
// progress paints for a disconnected visitor — this section works cold.
//
// TWO PROGRESS READINGS, ONE FIGURE. The lead indicator counts toward the next
// unreached tier; the thin bar under it counts toward the whole 100k ladder.
// They exist because the campaign tells people to "track progress toward the
// 10,000 MOR milestone" while the only bar here used to measure against 100,000
// — so at 7,453 MOR the page answered 7% to a reader expecting 74%, a tenth of
// what the announcement had promised. The lead figure is derived from
// `nextMilestone()`, never pinned to 10k, so it walks the ladder on its own.
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
import {
  isMilestoneDone,
  nextMilestone,
  SUBNET_GOAL_MOR,
  SUBNET_MILESTONES,
} from "@/lib/stake-milestones";
import { cn } from "@/lib/utils";

const fmtMor = (n: number, locale: string) =>
  n.toLocaleString(locale, { maximumFractionDigits: 0 });

export function SubnetSection() {
  const t = useTranslations("stake.page.subnet");
  const locale = useLocale();
  const { address: you } = useUserAddress();
  const { totalStaked, status } = useGnarsSubnet(you);
  const [open, setOpen] = useState(false);

  // Two readings of the same on-chain figure, never a second source: `next` is
  // the tier the campaign tells people to watch, `macro` is the whole ladder.
  // Both percentages measure from zero, which is what makes "7,453 / 10,000 —
  // 74%" arithmetic a visitor can check rather than a number they must trust.
  //
  // `floor`, not `round`: at 9,999 of 10,000 rounding prints "100%" beside a
  // milestone that has not been reached, which is the same kind of lie this
  // indicator exists to remove. Flooring says 99% until it is actually true.
  const next = nextMilestone(totalStaked);
  const tierPct = next ? Math.min(100, Math.floor((totalStaked / next.amountMor) * 100)) : 100;
  const macroPct = Math.min(100, Math.floor((totalStaked / SUBNET_GOAL_MOR) * 100));

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
            <p className={cn("font-mono text-[11px] tracking-[0.08em] uppercase", MICRO)}>
              {t("nextMilestone.label")}
            </p>

            {/* Loading and error are their own states, never a rendered 0. The
                hook starts `totalStaked` at 0, and painting that as a figure
                would read as "nobody has staked" mid-flight. */}
            {status !== "ready" ? (
              <p className={cn("mt-1.5 text-sm", MUTED)}>
                {t(status === "loading" ? "nextMilestone.loading" : "nextMilestone.error")}
              </p>
            ) : next ? (
              <>
                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-mono text-2xl font-bold tabular-nums">
                    <span className={MOR_TEXT}>{fmtMor(totalStaked, locale)}</span>
                    <span className={cn("text-base font-normal", MUTED)}>
                      {" / "}
                      {fmtMor(next.amountMor, locale)} MOR
                    </span>
                  </span>
                  <span className="font-mono text-2xl font-bold tabular-nums">{tierPct}%</span>
                </div>

                {/* The fill is full width and scaled, not a growing `width`:
                    animating width lays out and paints on every frame, a
                    transform does neither. 500ms is over the UI budget on
                    purpose — this is a value arriving from chain, and it should
                    be legible as "it filled to here". */}
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-foreground/[0.10]">
                  <div
                    // ease token: EASE_OUT in src/lib/motion.ts.
                    className={cn(
                      "h-full w-full origin-left rounded-full transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                      MOR_FILL,
                    )}
                    style={{ transform: `scaleX(${tierPct / 100})` }}
                  />
                </div>

                <p className="mt-2 text-sm">
                  {t("nextMilestone.unlocks", { what: t(`milestones.${next.id}`) })}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-sm font-semibold">{t("nextMilestone.allDone")}</p>
            )}
          </div>
          <Image
            src="/logos/morpheus.webp"
            alt="Morpheus"
            width={40}
            height={40}
            className="shrink-0 rounded-full"
          />
        </div>

        {/* The 100k ladder, demoted to context. It answers "how far through the
            whole programme", which is a different question from the one above —
            and the one the campaign does NOT ask people to track. Micro type and
            a neutral 1px fill: green stays on the figure that matters now, so
            two bars never compete for the same attention. */}
        {status === "ready" ? (
          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className={cn("font-mono text-xs tabular-nums", MICRO)}>
                {t("nextMilestone.macro", {
                  staked: Math.round(totalStaked),
                  target: SUBNET_GOAL_MOR,
                })}
              </span>
              <span className={cn("font-mono text-xs tabular-nums", MICRO)}>{macroPct}%</span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-foreground/[0.08]">
              <div
                className="h-full w-full origin-left rounded-full bg-foreground/30 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
                style={{ transform: `scaleX(${macroPct / 100})` }}
              />
            </div>
          </div>
        ) : null}

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
                  {t("milestoneRow", { n: m.amountMor, what: t(`milestones.${m.id}`) })}{" "}
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
