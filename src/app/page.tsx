'use client';

import { DaoHeader } from "@/components/dao-header";
import { KeyStats } from "@/components/key-stats";
import { ContractsList } from "@/components/contracts-list";
import { CurrentAuction } from "@/components/current-auction";
import { PastAuctions } from "@/components/past-auctions";

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
    <div className="min-h-screen bg-background">
      <DaoHeader />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Key Stats Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">DAO Overview</h2>
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

        {/* Current Auction Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Active Auction</h2>
          <CurrentAuction auction={mockCurrentAuction} />
        </section>

        {/* Two Column Layout for Contracts and Past Auctions */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Contracts List */}
          <section className="xl:col-span-1">
            <h2 className="text-2xl font-bold mb-6">Smart Contracts</h2>
            <ContractsList />
          </section>

          {/* Past Auctions */}
          <section className="xl:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Recent Auctions</h2>
            <PastAuctions 
              auctions={mockPastAuctions.slice(0, 8)}
              hasMore={true}
              onLoadMore={() => console.log('Load more auctions')}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
