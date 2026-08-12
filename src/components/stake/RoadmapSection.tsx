"use client";

// The four-phase roadmap, sitting directly under SubnetSection because it is the
// same story continued: the ladder above says what Gnars ships as the subnet
// grows, this says where the subnet itself is going.
//
// Its own card rather than a block inside SubnetSection — that card already
// carries a progress bar, a six-item ladder and the page's stake CTA, and a
// roadmap appended below the CTA would read as fine print under the button.
//
// No dates. A roadmap that prints quarters ages into a liability the first time
// one slips, so `status` (live / upcoming) is the only state a phase carries.
// Status and copy both live in messages/{en,pt-br}/stake.json; STAKE_ROADMAP is
// data only, the same split SUBNET_MILESTONES uses.
import { useTranslations } from "next-intl";
import { RevealItem, RevealSection } from "@/components/stake/Reveal";
import { SectionHeader } from "@/components/stake/SectionHeader";
import { CARD, CARD_PAD, MICRO, MUTED } from "@/components/stake/stake-ui";
import { STAKE_ROADMAP } from "@/lib/stake-roadmap";
import { cn } from "@/lib/utils";

export function RoadmapSection() {
  const t = useTranslations("stake.page.subnet.roadmap");

  return (
    <RevealSection className={cn(CARD, CARD_PAD, "space-y-4")}>
      <RevealItem>
        <SectionHeader title={t("title")} />
      </RevealItem>

      <RevealItem delay={50}>
        <ol className="space-y-4">
          {STAKE_ROADMAP.map((p) => {
            const live = p.status === "live";
            return (
              <li key={p.id} className="flex items-start gap-2.5">
                {/* Same dot language as the milestone ladder above: filled = real
                    now, hollow = not yet. Colourless for the same reason — green
                    belongs to the progress fill and the MOR total, nowhere else. */}
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    live ? "bg-foreground/70" : "border border-foreground/30",
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {t(`phases.${p.id}.title`)}{" "}
                    <span
                      className={cn(
                        "text-[10px] font-medium tracking-wide whitespace-nowrap uppercase",
                        MICRO,
                      )}
                    >
                      · {t(`status.${p.status}`)}
                    </span>
                  </p>
                  {/* Phase 4 carries an explicit "planned / not guaranteed"
                      hedge in both locales. It is what makes an airdrop tease
                      publishable — see src/lib/stake-roadmap.ts. */}
                  <p className={cn("mt-0.5 max-w-prose text-sm", MUTED)}>
                    {t(`phases.${p.id}.desc`)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </RevealItem>
    </RevealSection>
  );
}
