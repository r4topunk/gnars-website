"use client";

import { HeroStats } from "@/components/hero/HeroStats";
import { AuctionSpotlight } from "@/components/hero/AuctionSpotlight";

interface HeroSectionProps {
  stats: {
    totalSupply: number;
    members: number;
    treasuryValue?: string;
  };
}

export function HeroSection({ stats }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Hero Content */}
      <div className="relative bg-background z-10 mx-4 pt-8 mt-8 mb-4 md:py-10 lg:py-12 rounded-2xl">
        <div className="mx-auto max-w-6xl">
          {/* Main Hero */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left Column - Brand & CTA */}
            <HeroStats stats={stats} />

            {/* Right Column - Current Auction Spotlight */}
            <div className="flex items-center justify-center">
              <AuctionSpotlight />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
