import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for an individual propdate card (used in detail views).
 * Mirrors the PropdateCard layout: author row + content block.
 */
export function PropdateCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        {/* Header row: avatar circle + address + milestone badge + timestamp */}
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Content block */}
        <div className="mt-3 rounded-md border bg-muted/40 p-3 space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-10/12" />
          <Skeleton className="h-3.5 w-8/12" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton for a proposal-grouped feed card.
 * Mirrors the layout:
 *   - Proposal header: number pill + status badge + title + proposer
 *   - "Latest Update" label + content block
 *   - Footer: update count + link
 */
export function ProposalUpdateCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Proposal header */}
        <div className="space-y-2">
          {/* Prop # pill + status badge */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>

          {/* Proposal title */}
          <Skeleton className="h-5 w-3/4" />

          {/* Proposer: avatar + address + separator + timestamp */}
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded-full shrink-0" />
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-1 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Latest Update label */}
        <Skeleton className="h-3 w-28" />

        {/* Update content block */}
        <div className="rounded-md border bg-muted/40 p-3 space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-10/12" />
          <Skeleton className="h-3.5 w-8/12" />
        </div>
      </CardContent>

      {/* Footer: update count + view link */}
      <CardFooter className="px-4 py-3 flex items-center justify-between border-t">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-20" />
      </CardFooter>
    </Card>
  );
}

interface PropdatesFeedSkeletonProps {
  count?: number;
}

export function PropdatesFeedSkeleton({ count = 4 }: PropdatesFeedSkeletonProps) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading propdates feed">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-in fade-in-0"
          style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
        >
          <ProposalUpdateCardSkeleton />
        </div>
      ))}
    </div>
  );
}
