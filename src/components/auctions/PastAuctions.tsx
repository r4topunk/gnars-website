"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuctionCard } from "@/components/auctions/past/AuctionCard";
import { SectionHeader } from "@/components/common/SectionHeader";
import { LoadingGridSkeleton } from "@/components/skeletons/loading-grid-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

export function PastAuctions({
  auctions,
  loading,
  hasMore,
  onLoadMore,
  title = "Recent Auctions",
  description = "Latest completed auctions from the community",
  showViewAllButton = true,
  gridOnly = false,
}: PastAuctionsProps) {
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
      { rootMargin: "200px" },
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
          <LoadingGridSkeleton items={12} />
        ) : auctions?.length ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {auctions.slice(0, visibleCount).map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
            {loading && (
              <div className="mt-4">
                <LoadingGridSkeleton items={4} />
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
      <SectionHeader
        title={title}
        description={description}
        action={
          showViewAllButton ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/auctions">
                View all auctions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : undefined
        }
      />
      <CardContent>
        {loading && !auctions?.length ? (
          <LoadingGridSkeleton items={8} />
        ) : auctions?.length ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {auctions.slice(0, visibleCount).map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>

            {loading && (
              <div className="mt-4">
                <LoadingGridSkeleton items={4} />
              </div>
            )}
            {
              hasMore && (
                <div ref={sentinelRef} className="h-10" />
              )
            }
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
