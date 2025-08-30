'use client';

import { HeroSection } from "@/components/hero-section";
import { KeyStats } from "@/components/key-stats";
import { ContractsList } from "@/components/contracts-list";
import { CurrentAuction } from "@/components/current-auction";
import { PastAuctions } from "@/components/past-auctions";
import { AuctionTrendChart, TreasuryAllocationChart, MemberActivityChart } from "@/components/dashboard-charts";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Mock data - in a real app, this would come from API calls or hooks
const mockCurrentAuction = {
  id: "123",
  tokenId: "456",
  highestBid: "2.5",
  bidder: "0x742d35Cc6634C0532925a3b8D52E02c0a65A40f2",
  endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
  settled: false,
};

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
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero Section */}
        <HeroSection 
          currentAuction={mockCurrentAuction}
          stats={{
            totalSupply: 456,
            members: 342,
            treasuryValue: "247.3",
          }}
        />

        {/* Dashboard Grid */}
        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Key Statistics Cards */}
          <section>
            <KeyStats 
              currentAuction={{
                id: mockCurrentAuction.id,
                highestBid: mockCurrentAuction.highestBid,
                endTime: mockCurrentAuction.endTime.toISOString(),
              }}
              totalSupply={456}
              members={342}
            />
          </section>

          {/* Analytics Charts Row */}
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <AuctionTrendChart />
            <TreasuryAllocationChart />
            <MemberActivityChart />
          </section>

          {/* Detailed Content Grid */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Current Auction - Featured */}
            <section className="xl:col-span-2">
              <h2 className="text-2xl font-bold mb-6">Active Auction Details</h2>
              <CurrentAuction auction={mockCurrentAuction} />
            </section>

            {/* Smart Contracts */}
            <section className="xl:col-span-1">
              <h2 className="text-2xl font-bold mb-6">Smart Contracts</h2>
              <ContractsList />
            </section>
          </div>

          {/* Recent Activity */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Recent Auctions</h2>
            <PastAuctions 
              auctions={mockPastAuctions.slice(0, 8)}
              hasMore={true}
              onLoadMore={() => console.log('Load more auctions')}
            />
          </section>
        </div>
      </main>
    </SidebarInset>
  );
}
