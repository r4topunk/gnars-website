"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PropdateCard } from "@/components/proposals/detail/PropdateCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { type Propdate, listDaoPropdates } from "@/services/propdates";

export function PropdatesFeed() {
  const { data: propdates, isLoading, error } = useQuery({
    queryKey: ["propdates-feed"],
    queryFn: () => listDaoPropdates(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading propdates feed">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load propdates feed. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const sorted = [...(propdates ?? [])].sort((a: Propdate, b: Propdate) => b.timeCreated - a.timeCreated);

  // Incremental rendering like ProposalsGrid
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sorted.length));
      }
    }, { rootMargin: "200px" });

    const current = sentinelRef.current;
    if (current) observer.observe(current);
    return () => { if (current) observer.unobserve(current); };
  }, [sorted.length]);

  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(PAGE_SIZE, prev), sorted.length || PAGE_SIZE));
  }, [sorted.length]);

  if (sorted.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No propdates yet</div>;
  }

  return (
    <>
      <div className="space-y-4">
        {sorted.slice(0, visibleCount).map((p) => (
          <Link key={p.txid} href={`/propdates/${p.txid}`} className="block">
            <PropdateCard propdate={p} preview showContent />
          </Link>
        ))}
      </div>
      {sorted.length > visibleCount && (
        <div className="mt-4">
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      <div ref={sentinelRef} className="h-10" />
    </>
  );
}
