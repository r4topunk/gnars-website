"use client";

import dynamic from "next/dynamic";
import { PastAuctions } from "@/components/auctions/PastAuctions";
import { useRecentAuctions } from "@/hooks/use-auctions";
import { useIsMobile } from "@/hooks/use-mobile";

const AuctionBidsPerMonthChart = dynamic(
  () => import("@/components/treasury/AuctionBidsPerMonthChart").then(mod => ({ default: mod.AuctionBidsPerMonthChart })),
  { ssr: false, loading: () => <div className="h-[300px] rounded-xl bg-muted animate-pulse" /> }
);
const ProposalsPerMonthChart = dynamic(
  () => import("@/components/treasury/ProposalsPerMonthChart").then(mod => ({ default: mod.ProposalsPerMonthChart })),
  { ssr: false, loading: () => <div className="h-[300px] rounded-xl bg-muted animate-pulse" /> }
);
const MemberActivityChart = dynamic(
  () => import("@/components/treasury/MemberActivityChart").then(mod => ({ default: mod.MemberActivityChart })),
  { ssr: false, loading: () => <div className="h-[300px] rounded-xl bg-muted animate-pulse" /> }
);

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
    </>
  );
}
