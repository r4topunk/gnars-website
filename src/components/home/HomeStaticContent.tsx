"use client";

import { PastAuctions } from "@/components/auctions/PastAuctions";
import { FAQ } from "@/components/common/FAQ";
import { ContractsList } from "@/components/contracts-list";
import {
  ProposalsPerMonthChart,
  MemberActivityChart,
  AuctionBidsPerMonthChart,
} from "@/components/treasury/DashboardCharts";
import { useRecentAuctions } from "@/hooks/use-auctions";
import { useIsMobile } from "@/hooks/use-mobile";

export function HomeStaticContent() {
  const isMobile = useIsMobile();
  const recentAuctionsLimit = isMobile ? 3 : 8;
  const { data: recentAuctions, isLoading } = useRecentAuctions(recentAuctionsLimit);

  return (
    <>
      {/* Analytics Charts Row */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <AuctionBidsPerMonthChart />
        <ProposalsPerMonthChart />
        <MemberActivityChart />
      </section>

      {/* Recent Auctions */}
      <section>
        <PastAuctions auctions={recentAuctions} loading={isLoading} />
      </section>

      {/* FAQ Section */}
      <section>
        <FAQ />
      </section>

      {/* Smart Contracts */}
      <section>
        <ContractsList />
      </section>
    </>
  );
}
