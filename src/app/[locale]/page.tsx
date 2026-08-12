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

// Carried over verbatim from the previous homepage when this page took over `/`.
// It is the site's canonical entry: dropping it here would leave the homepage
// with no title, no description and no hreflang pair, which is how a homepage
// silently falls out of the index.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.home" });
  const canonical = locale === "en" ? "/" : "/pt-br";
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: {
        en: "/",
        "pt-br": "/pt-br",
        "x-default": "/",
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

function formatLargeNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(0);
}

/**
 * The homepage.
 *
 * Built as the /newhome experiment and promoted to `/` once it was reviewed
 * section by section; the page it replaced still exists at /oldhome as a
 * noindex rollback reference. Everything that can be real is real — DAO stats,
 * treasury, poidh bounties, the rails dataset, the TV feed, the live auction.
 *
 * Its components and messages still live under `newhome/` — renaming them would
 * collide with the `home/` components that /oldhome still uses. That rename is
 * the cleanup for whoever deletes /oldhome.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
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
    <div className="relative -mx-4 flex flex-1 flex-col text-foreground">
      {/* Full-viewport ground. A fixed backdrop rather than a 100vw block: the
          page lives inside the layout's centred `main`, and widening past it
          would add a horizontal scrollbar on every platform that reserves one.
          `bg-background` rather than a hardcoded near-black: this route used to
          be pinned dark and ignored the theme toggle entirely. */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-background" />

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
