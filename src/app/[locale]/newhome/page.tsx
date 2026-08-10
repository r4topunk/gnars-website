import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BountiesSection } from "@/components/newhome/BountiesSection";
import { GovSection } from "@/components/newhome/GovSection";
import { HeroSection, type HeroStat } from "@/components/newhome/HeroSection";
import { Interlude } from "@/components/newhome/primitives";
import { RailsSection } from "@/components/newhome/RailsSection";
import { StakeSection } from "@/components/newhome/StakeSection";
import { SwapSection } from "@/components/newhome/SwapSection";
import { TVHeroSection } from "@/components/newhome/TVHeroSection";
import { NOGGLES_RAILS } from "@/content/nogglesrails";
import { DAO_ADDRESSES } from "@/lib/config";
import { fetchDaoStats } from "@/services/dao";
import { fetchPoidhBounties } from "@/services/poidh";
import { loadTreasurySnapshot } from "@/services/treasury";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Gnars — new homepage (experiment)",
  robots: { index: false, follow: false },
};

function formatLargeNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(0);
}

/**
 * The /newhome experiment.
 *
 * Not the live homepage: this is the Claude Design "Gnars Homepage" build, kept
 * on its own route so both can be opened side by side while each section is
 * reviewed. Everything that can be real is real — DAO stats, treasury, poidh
 * bounties, the rails dataset, the TV feed, the live auction.
 */
export default async function NewHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("newhome");

  const [daoStats, treasury, bounties] = await Promise.all([
    fetchDaoStats().catch(() => ({ totalSupply: 0, ownerCount: 0 })),
    loadTreasurySnapshot(DAO_ADDRESSES.treasury).catch(() => ({
      usdTotal: null,
      ethBalance: 0,
      totalAuctionSales: 0,
    })),
    fetchPoidhBounties({ status: "open", limit: 100, filterGnarly: true }).catch(() => ({
      bounties: [],
      total: 0,
    })),
  ]);

  const treasuryLabel =
    treasury.usdTotal == null ? "—" : `$${formatLargeNumber(treasury.usdTotal)}`;
  const railCount = NOGGLES_RAILS.length;

  // No total-supply tile: `ownerCount` is the subgraph's distinct-owner count,
  // so Members already answers "how many people are in this" — the supply number
  // beside it just read as a second, larger membership figure.
  const heroStats: HeroStat[] = [
    { value: String(daoStats.ownerCount), label: t("hero.stats.members"), icon: "members" },
    { value: treasuryLabel, label: t("hero.stats.treasury"), icon: "treasury" },
    { value: String(railCount), label: t("hero.stats.rails"), icon: "rails" },
  ];

  return (
    <div className="relative -mx-4 flex flex-1 flex-col text-neutral-50">
      {/* Full-viewport ground. A fixed backdrop rather than a 100vw block: the
          page lives inside the layout's centred `main`, and widening past it
          would add a horizontal scrollbar on every platform that reserves one. */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-[#0a0a0a]" />

      <HeroSection stats={heroStats} />
      <TVHeroSection />

      <StakeSection />
      <Interlude eyebrow={t("stake.whyEyebrow")}>{t("stake.whyBody")}</Interlude>

      <BountiesSection initialBounties={bounties} />
      <Interlude eyebrow={t("bounties.whyEyebrow")} eyebrowClassName="text-[#FF2D2D]">
        {t("bounties.whyBody")}
      </Interlude>

      <RailsSection />
      <Interlude eyebrow={t("rails.whyEyebrow")} eyebrowClassName="text-[#6699cc]">
        {t("rails.whyBody")}
      </Interlude>

      <GovSection />

      <SwapSection />
      <Interlude eyebrow={t("swap.whyEyebrow")}>{t("swap.whyBody")}</Interlude>
    </div>
  );
}
