"use client";

export function RecentProposalsLoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="h-48 bg-muted rounded animate-pulse" />
      <div className="h-48 bg-muted rounded animate-pulse" />
      <div className="h-48 bg-muted rounded animate-pulse" />
    </div>
  );
}


