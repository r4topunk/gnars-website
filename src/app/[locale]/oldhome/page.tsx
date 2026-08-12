import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FAQ } from "@/components/common/FAQ";
import { ContractsList } from "@/components/contracts-list";
import { AuctionSpotlight } from "@/components/hero/AuctionSpotlight";
import { ActivityFeedSection } from "@/components/home/ActivityFeedSection";
import { AnimatedDescription } from "@/components/home/AnimatedDescription";
import { HeroStatsValues } from "@/components/home/HeroStatsValues";
import { HomeStaticContent } from "@/components/home/HomeStaticContent";
import { PoweredByMorpheus } from "@/components/home/PoweredByMorpheus";
import { RecentProposalsSection } from "@/components/home/RecentProposalsSection";
import {
  ActivityFeedSkeleton,
  HeroStatsSkeleton,
  RecentProposalsSkeleton,
} from "@/components/skeletons/home-skeletons";
import { Gnar3DTVClient } from "@/components/tv/Gnar3DTVClient";
import { HeroTVObserver } from "@/components/tv/HeroTVObserver";
import { Link } from "@/i18n/navigation";

export const revalidate = 300;

// Deliberately NOT the homepage's metadata. This page served `/` until the
// /newhome build replaced it, and its `generateMetadata` moved with the route —
// canonical, hreflang and the translated title now live in [locale]/page.tsx.
// Leaving a second page claiming `canonical: "/"` would make the site compete
// with itself for its own homepage.
//
// noindex because this is a rollback reference, not a destination: it is absent
// from the sitemap and from the nav, and it should be deleted once the new
// homepage has proven itself. Deleting it is also what unblocks renaming
// `components/newhome/` to `home/`.
export const metadata: Metadata = {
  title: "Gnars — previous homepage",
  robots: { index: false, follow: false },
};

export default async function OldHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero Section - Static content renders immediately */}
      <section className="relative overflow-hidden">
        <div className="relative bg-background z-10 py-8 md:py-10 lg:py-12">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
              {/* Left Column - Brand & Stats */}
              <div className="flex flex-col justify-center space-y-6">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                    <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                      {t("hero.title")}
                    </span>
                    <span className="sr-only">{t("hero.srOnly")}</span>
                  </h1>
                  <AnimatedDescription />
                </div>

                {/* Stats - Only this part streams in */}
                <Suspense fallback={<HeroStatsSkeleton />}>
                  <HeroStatsValues />
                </Suspense>
              </div>

              {/* Right Column - 3D TV (Client Component) */}
              <HeroTVObserver>
                <div className="flex items-center justify-center">
                  <Gnar3DTVClient autoRotate={true} />
                </div>
              </HeroTVObserver>
            </div>
          </div>
        </div>
      </section>

      {/* Community × community — Gnars is a Morpheus Builder (gated on the subnet goal) */}
      <Suspense fallback={null}>
        <PoweredByMorpheus />
      </Suspense>

      {/* Dashboard Grid */}
      <div className="flex flex-1 flex-col gap-6 py-8">
        {/* SEO-only context */}
        <section className="sr-only">
          <h2>{t("seo.whatIsGnars")}</h2>
          <p>{t("seo.body1")}</p>
          <p>{t("seo.body2")}</p>
          <p>
            Learn more about <Link href="/about">{t("seo.linkAbout")}</Link>, explore{" "}
            <Link href="/proposals">{t("seo.linkProposals")}</Link>, or view{" "}
            <Link href="/auctions">{t("seo.linkAuctions")}</Link>.
          </p>
        </section>

        {/* Recent Proposals Section */}
        <section>
          <Suspense fallback={<RecentProposalsSkeleton />}>
            <RecentProposalsSection limit={6} />
          </Suspense>
        </section>

        {/* Auction + Activity Feed - Side by side on desktop */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Auction Spotlight - determines row height on desktop */}
          <AuctionSpotlight />

          {/* Activity Feed - fixed height on mobile, matches auction on desktop via absolute */}
          <div className="relative h-[500px] lg:h-auto">
            <div className="lg:absolute lg:inset-0 h-full">
              <Suspense fallback={<ActivityFeedSkeleton responsive />}>
                <ActivityFeedSection daysBack={30} responsive singleColumn />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Static/Client-side content: Charts, Auctions */}
        <HomeStaticContent />

        {/* FAQ Section */}
        <section>
          <FAQ />
        </section>

        {/* Smart Contracts */}
        <section>
          <ContractsList />
        </section>
      </div>
    </div>
  );
}
