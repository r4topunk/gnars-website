'use client';

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PastAuction {
  id: string;
  tokenId: string;
  imageUrl?: string;
  finalBid: string;
  winner: string;
  endTime: Date;
  settled: boolean;
}

interface PastAuctionsProps {
  auctions?: PastAuction[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

function AuctionCard({ auction }: { auction: PastAuction }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="space-y-4 px-4">
        <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative rounded-xl">
          {auction.imageUrl ? (
            <Image
              src={auction.imageUrl}
              alt={`Gnar ${auction.tokenId}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl font-bold mb-1">#{auction.tokenId}</div>
                <div className="text-xs">Gnar NFT</div>
              </div>
            </div>
          )}
          <div className="absolute top-2 right-2">
            {auction.settled ? (
              <Badge variant="secondary" className="text-xs">
                Settled
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                Pending
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-top justify-between">
            <h3 className="font-semibold">Gnar #{auction.tokenId}</h3>
            <div className="text-xs text-muted-foreground pt-1">
              {auction.endTime.toLocaleDateString()}
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Final bid</div>
            <div className="font-bold text-lg">{auction.finalBid} ETH</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Winner</div>
            <div className="font-mono text-sm">
              {auction.winner.slice(0, 6)}...{auction.winner.slice(-4)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AuctionCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div>
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div>
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PastAuctions({ auctions, loading, hasMore, onLoadMore }: PastAuctionsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Auctions</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Latest completed auctions from the community
            </p>
          </div>
          <Button variant="outline" size="sm">
            View all auctions
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !auctions?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <AuctionCardSkeleton key={i} />
            ))}
          </div>
        ) : auctions?.length ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {auctions.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>

            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <AuctionCardSkeleton key={`loading-${i}`} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No past auctions found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}