'use client';

import { HeroSection } from "@/components/hero-section";
import { ContractsList } from "@/components/contracts-list";
import { PastAuctions } from "@/components/past-auctions";
import { RecentProposals, ProposalStatus } from "@/components/recent-proposals";
import { AuctionTrendChart, TreasuryAllocationChart, MemberActivityChart } from "@/components/dashboard-charts";
import {
  SidebarInset,
} from "@/components/ui/sidebar";
import { useRecentAuctions } from '@/hooks/use-auctions'

// Remove mocks in favor of real data from the subgraph

export default function Home() {
  const { data: recentAuctions, isLoading } = useRecentAuctions(8)
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
              auctions={recentAuctions}
              loading={isLoading}
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
