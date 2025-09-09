"use client";

import { LoadingGridSkeleton } from "@/components/skeletons/loading-grid-skeleton";

export function RecentProposalsLoadingSkeleton({ items = 6 }: { items?: number }) {
  return (
    <LoadingGridSkeleton
      items={items}
      withCard
      aspectClassName="h-24"
      containerClassName="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    />
  );
}


