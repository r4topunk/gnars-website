import { Suspense } from "react";
import { NftHoldings } from "@/components/nft-holdings";
import { TokenHoldings } from "@/components/token-holdings";
import { TreasuryBalance } from "@/components/treasury-balance";
import { AuctionTrendChart, MemberActivityChart, TreasuryAllocationChart } from "@/components/dashboard-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GNARS_ADDRESSES } from "@/lib/config";

export default function TreasuryPage() {
  return (
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
          <div className="lg:col-span-1">
            <TreasuryAllocationChart />
          </div>
          <div className="lg:col-span-1">
            <AuctionTrendChart />
          </div>
          <div className="lg:col-span-1">
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
  );
}

// Loading skeletons
function TreasuryValueSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Total Treasury Value</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-48" />
      </CardContent>
    </Card>
  );
}

function MetricSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function NftGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="aspect-square w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-1" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
