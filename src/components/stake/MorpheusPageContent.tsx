"use client";

// The /morpheus landing — the page the Gnars subnet bio on the Morpheus site
// links to. A cold visitor arrives knowing Morpheus but not Gnars, so the hero
// explains the whole build before asking for anything. Below it the page reuses
// the production subnet components rather than restating them: SubnetSection
// carries the live ladder + stake CTA, RoadmapSection the four phases. /stake
// stays the multi-purpose page; this one is single-purpose.
//
// Custody copy rule (same as everywhere else): every claim in `facts` was read
// from the verified BuildersV4 source — permissionless withdraw to the staker's
// wallet, 7-day lock counted from the LAST deposit, rewards accrue to the
// subnet. Don't add a claim here without reading the contract first.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import {
  Clapperboard,
  Flag,
  Gift,
  HandCoins,
  MapPin,
  Megaphone,
  Rocket,
  Shirt,
  Tv,
} from "lucide-react";
import { CHARACTERS } from "@/components/stake/CharacterSelector";
import { GnarsStakeDialog } from "@/components/stake/GnarsStakeDialog";
import { RoadmapSection } from "@/components/stake/RoadmapSection";
import { CARD, CARD_PAD, GOLD, GOLD_CTA, GOLD_INK, MUTED } from "@/components/stake/stake-ui";
import { SubnetSection } from "@/components/stake/SubnetSection";
import { Button } from "@/components/ui/button";
import { useGnarsSubnet } from "@/hooks/use-gnars-subnet";
import { Link } from "@/i18n/navigation";
import { isMilestoneDone, nextMilestone, SUBNET_MILESTONES } from "@/lib/stake-milestones";
import { cn } from "@/lib/utils";

// One icon per flywheel step and per milestone rung. Data-keyed (not positional)
// so a ladder edit in stake-milestones.ts can't silently shift every icon.
const STEP_ICONS = { step1: HandCoins, step2: Gift, step3: Megaphone } as const;
// The four riders who narrate the page, one Morpheus topic each. Heads are
// cropped from the /stake cut-outs with the roster's own face zoom data, so a
// new cut-out automatically works here too.
const CREW = ["vlad", "r4to", "yan", "pamtech"] as const;

const RUNG_ICONS: Record<string, typeof Tv> = {
  "10k": Tv,
  "15k": Flag,
  "25k": Clapperboard,
  "30k": Shirt,
  "50k": MapPin,
  "100k": Rocket,
};

export function MorpheusPageContent() {
  const t = useTranslations("stake.morpheusPage");
  const tSub = useTranslations("stake.page.subnet");
  const tChar = useTranslations("stake.characters");
  const locale = useLocale();
  const [stakeOpen, setStakeOpen] = useState(false);
  const { totalStaked } = useGnarsSubnet();
  const next = nextMilestone(totalStaked);

  const steps = ["step1", "step2", "step3"] as const;
  const facts = ["f1", "f2", "f3"] as const;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 sm:px-6">
      {/* Hero */}
      <section className={`${CARD} ${CARD_PAD} sm:p-8`}>
        <div className="flex items-center gap-2.5">
          <Image
            src="/logos/morpheus.webp"
            alt="Morpheus"
            width={28}
            height={28}
            className="rounded-md"
          />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("eyebrow")}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t("title")}</h1>
        <p className={`mt-3 max-w-2xl text-sm sm:text-base ${MUTED}`}>{t("lede")}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => setStakeOpen(true)}
            className={GOLD_CTA}
            style={{ backgroundImage: GOLD, color: GOLD_INK }}
          >
            {t("ctaStake")}
          </Button>
          <Button asChild variant="outline">
            <Link href="/stake">{t("ctaFull")}</Link>
          </Button>
        </div>
      </section>

      {/* The flywheel, in three steps */}
      <section className={`${CARD} ${CARD_PAD}`}>
        <h2 className="text-lg font-bold tracking-tight">{t("how.title")}</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {steps.map((s) => {
            const Icon = STEP_ICONS[s];
            return (
              <li key={s} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </div>
                <div className="mt-2.5 text-sm font-semibold">{t(`how.${s}t`)}</div>
                <p className={`mt-1 text-xs leading-relaxed ${MUTED}`}>{t(`how.${s}d`)}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* The amplification ladder, illustrated — the marketing Gnars ships for
          Morpheus at each rung, with live unlock state. Morpheus green is the
          accent on purpose: this page is the Morpheus page. */}
      <section className={`${CARD} ${CARD_PAD} sm:p-8`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight">{t("amp.title")}</h2>
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            {t("amp.liveChip", { n: Math.floor(totalStaked) })}
          </span>
        </div>
        <p className={`mt-1.5 max-w-2xl text-sm ${MUTED}`}>{t("amp.desc")}</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUBNET_MILESTONES.map((m) => {
            const done = isMilestoneDone(m, totalStaked);
            const isNext = next?.id === m.id;
            const Icon = RUNG_ICONS[m.id] ?? Rocket;
            return (
              <li
                key={m.id}
                className={cn(
                  "rounded-2xl border p-4 transition-colors",
                  done &&
                    "border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.12] to-transparent",
                  isNext &&
                    "border-amber-500/50 bg-gradient-to-br from-amber-500/[0.08] to-transparent",
                  !done && !isNext && "border-border/60 bg-background/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      done
                        ? "bg-emerald-500 text-white"
                        : isNext
                          ? "bg-amber-500/90 text-white"
                          : "border border-border text-muted-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      done
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                        : isNext
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                          : "text-muted-foreground",
                    )}
                  >
                    {done ? t("amp.unlocked") : isNext ? t("amp.next") : t("amp.upcoming")}
                  </span>
                </div>
                <div className="mt-3 text-xl font-black tabular-nums">
                  {m.amountMor.toLocaleString(locale)}{" "}
                  <span className="text-xs font-medium text-muted-foreground">MOR</span>
                </div>
                <div className="mt-1 text-sm font-medium leading-snug">
                  {tSub(`milestones.${m.id}`)}
                </div>
                <div
                  className={`mt-1.5 text-[10px] font-semibold uppercase tracking-wider ${MUTED}`}
                >
                  {tSub(`firmness.${m.firmness}`)}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* The crew explains it, fighting-game style: rider heads from the /stake
          cut-outs + speech balloons. This is also where the Morpheus-powered
          SPONSORSHIP VAULTS get their mention — the subnet sections above are
          about MOR, this bubble routes people to the rider side. */}
      <section className={`${CARD} ${CARD_PAD} sm:p-8`}>
        <h2 className="text-lg font-bold tracking-tight">{t("crew.title")}</h2>
        <div className="mt-5 flex flex-col gap-5">
          {CREW.map((id, i) => {
            const c = CHARACTERS.find((x) => x.id === id);
            if (!c) return null;
            const flipped = i % 2 === 1;
            return (
              <div
                key={id}
                className={cn("flex items-start gap-3 sm:gap-4", flipped && "flex-row-reverse")}
              >
                <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 sm:w-20">
                  <div
                    aria-hidden
                    className={cn("h-16 w-16 rounded-full bg-muted ring-2 sm:h-20 sm:w-20", c.ring)}
                    style={{
                      backgroundImage: `url("${c.image}")`,
                      backgroundSize: c.face.size,
                      backgroundPosition: c.face.pos,
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {tChar(`${id}.name`)}
                  </span>
                </div>
                <div
                  className={cn(
                    "relative max-w-xl rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm leading-relaxed shadow-sm",
                    flipped ? "mr-1.5" : "ml-1.5",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-7 h-3 w-3 rotate-45 border-border/60 bg-card",
                      flipped ? "-right-1.5 border-t border-r" : "-left-1.5 border-b border-l",
                    )}
                  />
                  {t(`crew.${id}`)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Custody facts — every line verified against the contract */}
      <section className={`${CARD} ${CARD_PAD}`}>
        <h2 className="text-lg font-bold tracking-tight">{t("facts.title")}</h2>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {facts.map((f) => (
            <li key={f} className={`text-xs leading-relaxed ${MUTED}`}>
              {t(`facts.${f}`)}
            </li>
          ))}
        </ul>
      </section>

      {/* Live ladder + stake CTA, and the four phases — the production sections */}
      <SubnetSection showChecklist={false} />
      <RoadmapSection />

      <GnarsStakeDialog open={stakeOpen} onOpenChange={setStakeOpen} />
    </div>
  );
}
