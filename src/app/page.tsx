import { Suspense } from "react";
import { AuctionSpotlight } from "@/components/hero/AuctionSpotlight";
import { ActivityFeedSection } from "@/components/home/ActivityFeedSection";
import { AnimatedDescription } from "@/components/home/AnimatedDescription";
import { HeroStatsValues } from "@/components/home/HeroStatsValues";
import { HomeStaticContent } from "@/components/home/HomeStaticContent";
import { RecentProposalsSection } from "@/components/home/RecentProposalsSection";
import {
  ActivityFeedSkeleton,
  HeroStatsSkeleton,
  RecentProposalsSkeleton,
} from "@/components/skeletons/home-skeletons";
import { Gnar3DTV } from "@/components/tv";

export const dynamic = "force-dynamic";

export default function Home() {
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
                      Gnars DAO
                    </span>
                  </h1>
                  <AnimatedDescription />
                </div>

                {/* Stats - Only this part streams in */}
                <Suspense fallback={<HeroStatsSkeleton />}>
                  <HeroStatsValues />
                </Suspense>
              </div>

              {/* Right Column - 3D TV (Client Component) */}
              <div className="flex items-center justify-center">
                <Gnar3DTV autoRotate={true} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Grid */}
      <div className="flex flex-1 flex-col gap-6 py-8">
        {/* Recent Proposals Section */}
        <section>
          <Suspense fallback={<RecentProposalsSkeleton />}>
            <RecentProposalsSection limit={3} />
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

        {/* Static/Client-side content: Charts, Auctions, FAQ, Contracts */}
        <HomeStaticContent />
      </div>
    </div>
  );
}
