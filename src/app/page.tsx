'use client';

import { HeroSection } from "@/components/hero-section";
import { ContractsList } from "@/components/contracts-list";
import { PastAuctions } from "@/components/past-auctions";
import { RecentProposals, ProposalStatus } from "@/components/recent-proposals";
import { AuctionTrendChart, TreasuryAllocationChart, MemberActivityChart } from "@/components/dashboard-charts";
import {
  SidebarInset,
} from "@/components/ui/sidebar";

const mockPastAuctions = Array.from({ length: 12 }, (_, i) => ({
  id: (122 - i).toString(),
  tokenId: (455 - i).toString(),
  finalBid: (Math.random() * 5 + 0.1).toFixed(2),
  winner: `0x${Math.random().toString(16).substring(2, 42)}`,
  endTime: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
  settled: true,
}));

export default function Home() {
  return (
    <SidebarInset>
      <main className="flex flex-1 flex-col">
        {/* Hero Section */}
        <HeroSection
          stats={{
            totalSupply: 456,
            members: 342,
            treasuryValue: "247.3",
          }}
        />

        {/* Dashboard Grid */}
        <div className="flex flex-1 flex-col gap-6 px-6 py-4">

          {/* Recent Proposals Section */}
          <section>
            <RecentProposals limit={6} excludeStatuses={[ProposalStatus.CANCELLED]} />
          </section>

          {/* Analytics Charts Row */}
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <AuctionTrendChart />
            <TreasuryAllocationChart />
            <MemberActivityChart />
          </section>

          {/* Recent Auctions */}
          <section>
            <PastAuctions 
              auctions={mockPastAuctions.slice(0, 8)}
              hasMore={true}
              onLoadMore={() => console.log('Load more auctions')}
            />
          </section>

          {/* Smart Contracts */}
          <section>
            <ContractsList />
          </section>
        </div>
      </main>
    </SidebarInset>
  );
}
