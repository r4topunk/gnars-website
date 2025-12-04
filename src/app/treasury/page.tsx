import { Suspense } from "react";
import {
  MetricSkeleton,
  NftGridSkeleton,
  TableSkeleton,
  TreasuryValueSkeleton,
} from "@/components/skeletons/treasury-skeletons";
import {
  ProposalsPerMonthChart,
  MemberActivityChart,
  AuctionBidsPerMonthChart,
} from "@/components/treasury/DashboardCharts";
import { NftHoldings } from "@/components/treasury/NftHoldings";
import { TokenHoldings } from "@/components/treasury/TokenHoldings";
import { ZoraCoinHoldings } from "@/components/treasury/ZoraCoinHoldings";
import { TreasuryBalance } from "@/components/treasury/TreasuryBalance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GNARS_ADDRESSES } from "@/lib/config";

export default function TreasuryPage() {
  return (
    <div className="py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Treasury</h1>
            <p className="text-muted-foreground">
              Overview of the Gnars DAO treasury holdings and financial position
            </p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Suspense fallback={<TreasuryValueSkeleton />}>
              <Card className="gap-2">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Treasury Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <TreasuryBalance treasuryAddress={GNARS_ADDRESSES.treasury} />
                </CardContent>
              </Card>
            </Suspense>

            <Suspense fallback={<MetricSkeleton />}>
              <Card className="gap-2">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">ETH Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <TreasuryBalance treasuryAddress={GNARS_ADDRESSES.treasury} metric="eth" />
                </CardContent>
              </Card>
            </Suspense>

            <Suspense fallback={<MetricSkeleton />}>
              <Card className="gap-2">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Auction Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <TreasuryBalance treasuryAddress={GNARS_ADDRESSES.treasury} metric="auctions" />
                </CardContent>
              </Card>
            </Suspense>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 min-w-0">
              <AuctionBidsPerMonthChart />
            </div>
            <div className="lg:col-span-1 min-w-0">
              <ProposalsPerMonthChart />
            </div>
            <div className="lg:col-span-1 min-w-0">
              <MemberActivityChart />
            </div>
          </div>

          {/* Token Holdings Table */}
          <Suspense fallback={<TableSkeleton />}>
            <TokenHoldings treasuryAddress={GNARS_ADDRESSES.treasury} />
          </Suspense>

          {/* Zora Coin Holdings */}
          <Suspense fallback={<TableSkeleton />}>
            <ZoraCoinHoldings treasuryAddress={GNARS_ADDRESSES.treasury} />
          </Suspense>

          {/* NFT Holdings Grid */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">NFT Holdings</h2>
              <p className="text-sm text-muted-foreground">
                Non-fungible tokens held in the treasury
              </p>
            </div>
            <Suspense fallback={<NftGridSkeleton />}>
              <NftHoldings treasuryAddress={GNARS_ADDRESSES.treasury} />
            </Suspense>
          </div>
        </div>
      </div>
  );
}
