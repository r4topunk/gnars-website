import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TreasuryBalance } from '@/components/treasury-balance';
import { TokenHoldings } from '@/components/token-holdings';
import { NftHoldings } from '@/components/nft-holdings';
import { GNARS_ADDRESSES } from '@/lib/config';

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

        {/* Primary Metric: Total USD Value */}
        <Suspense fallback={<TreasuryValueSkeleton />}>
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Treasury Value</CardTitle>
            </CardHeader>
            <CardContent>
              <TreasuryBalance treasuryAddress={GNARS_ADDRESSES.treasury} />
            </CardContent>
          </Card>
        </Suspense>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Suspense fallback={<MetricSkeleton />}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">ETH Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <TreasuryBalance 
                  treasuryAddress={GNARS_ADDRESSES.treasury} 
                  metric="eth" 
                />
              </CardContent>
            </Card>
          </Suspense>

          <Suspense fallback={<MetricSkeleton />}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Auction Sales</CardTitle>
                <CardDescription>
                  Cumulative ETH raised from all auctions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TreasuryBalance 
                  treasuryAddress={GNARS_ADDRESSES.treasury} 
                  metric="auctions" 
                />
              </CardContent>
            </Card>
          </Suspense>
        </div>

        {/* Token Holdings Table */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Token Holdings</h2>
            <p className="text-sm text-muted-foreground">
              ERC-20 tokens held in the treasury
            </p>
          </div>
          <Suspense fallback={<TableSkeleton />}>
            <TokenHoldings treasuryAddress={GNARS_ADDRESSES.treasury} />
          </Suspense>
        </div>

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
      <CardHeader className="pb-2">
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