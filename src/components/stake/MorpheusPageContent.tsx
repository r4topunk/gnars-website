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
import { useTranslations } from "next-intl";
import Image from "next/image";
import { GnarsStakeDialog } from "@/components/stake/GnarsStakeDialog";
import { RoadmapSection } from "@/components/stake/RoadmapSection";
import { CARD, CARD_PAD, GOLD, GOLD_CTA, GOLD_INK, MUTED } from "@/components/stake/stake-ui";
import { SubnetSection } from "@/components/stake/SubnetSection";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function MorpheusPageContent() {
  const t = useTranslations("stake.morpheusPage");
  const [stakeOpen, setStakeOpen] = useState(false);

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
          {steps.map((s, i) => (
            <li key={s} className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                {i + 1}
              </div>
              <div className="mt-2.5 text-sm font-semibold">{t(`how.${s}t`)}</div>
              <p className={`mt-1 text-xs leading-relaxed ${MUTED}`}>{t(`how.${s}d`)}</p>
            </li>
          ))}
        </ol>
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
      <SubnetSection />
      <RoadmapSection />

      <GnarsStakeDialog open={stakeOpen} onOpenChange={setStakeOpen} />
    </div>
  );
}
