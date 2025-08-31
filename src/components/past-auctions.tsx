'use client';

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  title?: string;
  description?: string;
  showViewAllButton?: boolean;
  gridOnly?: boolean;
}

function AuctionCard({ auction }: { auction: PastAuction }) {
  const isZeroFinal = Number(auction.finalBid) === 0;
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="space-y-4 px-4">
        <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative rounded-xl overflow-hidden">
          {auction.imageUrl ? (
            <Image
              src={auction.imageUrl}
              alt={`Gnar ${auction.tokenId}`}
              fill
              className="object-cover rounded-xl"
              loading="lazy"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
              quality={30}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl font-bold mb-1">#{auction.tokenId}</div>
                <div className="text-xs">Gnar NFT</div>
              </div>
            </div>
          )}
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
            <div className="font-bold text-lg">{isZeroFinal ? '-' : `${auction.finalBid} ETH`}</div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground">Winner</div>
            <div className="font-mono text-sm">
              {isZeroFinal ? '-' : `${auction.winner.slice(0, 6)}...${auction.winner.slice(-4)}`}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AuctionCardSkeleton() {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="space-y-4 px-4">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="space-y-2">
          <div className="flex items-top justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div>
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div>
            <Skeleton className="h-3 w-12 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PastAuctions({ auctions, loading, hasMore, onLoadMore, title = "Recent Auctions", description = "Latest completed auctions from the community", showViewAllButton = true, gridOnly = false }: PastAuctionsProps) {
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset visible count if list becomes shorter (e.g., new query)
  useEffect(() => {
    if (!auctions) return;
    setVisibleCount((prev) => Math.min(Math.max(PAGE_SIZE, prev), auctions.length));
  }, [auctions]);

  // IntersectionObserver to load more on scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;

        setVisibleCount((prev) => {
          const next = prev + PAGE_SIZE;
          const currentLength = auctions?.length ?? 0;
          // If we've reached the end of the currently loaded items, ask parent for more
          if (next >= currentLength && !loading && hasMore && onLoadMore) {
            onLoadMore();
          }
          return next;
        });
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => {
      observer.unobserve(el);
      observer.disconnect();
    };
  }, [auctions, loading, gridOnly, hasMore, onLoadMore]);

  if (gridOnly) {
    return (
      <>
        {loading && !auctions?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <AuctionCardSkeleton key={i} />
            ))}
          </div>
        ) : auctions?.length ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {auctions.slice(0, visibleCount).map((auction) => (
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
            <div ref={sentinelRef} className="h-10" />
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No past auctions found.</p>
          </div>
        )}
      </>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          </div>
          {showViewAllButton && (
            <Link href="/auction">
              <Button variant="outline" size="sm">
                <span>View all auctions</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
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
              {auctions.slice(0, visibleCount).map((auction) => (
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
            <div ref={sentinelRef} className="h-10" />
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