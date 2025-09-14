import { Suspense } from "react";
import { NftHoldings } from "@/components/treasury/NftHoldings";
import { TokenHoldings } from "@/components/treasury/TokenHoldings";
import { TreasuryBalance } from "@/components/treasury/TreasuryBalance";
import { AuctionTrendChart, MemberActivityChart, TreasuryAllocationChart } from "@/components/treasury/DashboardCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TreasuryValueSkeleton, MetricSkeleton, TableSkeleton, NftGridSkeleton } from "@/components/skeletons/treasury-skeletons";
import { GNARS_ADDRESSES } from "@/lib/config";
import { SidebarInset } from "@/components/ui/sidebar";

export default function TreasuryPage() {
  return (
    <SidebarInset>
      <div className="container mx-auto px-4 py-8">
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
              <TreasuryAllocationChart />
            </div>
            <div className="lg:col-span-1 min-w-0">
              <AuctionTrendChart />
            </div>
            <div className="lg:col-span-1 min-w-0">
              <MemberActivityChart />
            </div>
          </div>

          {/* Token Holdings Table */}
          <Suspense fallback={<TableSkeleton />}>
            <TokenHoldings treasuryAddress={GNARS_ADDRESSES.treasury} />
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
    </SidebarInset>
  );
}
