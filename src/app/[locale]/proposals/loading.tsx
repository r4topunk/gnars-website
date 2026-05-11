import { ProposalsGridSkeleton } from "@/components/proposals/ProposalsGrid";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="py-8">
      <div className="space-y-5">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-96 max-w-full mt-2" />
        </div>

        {/* Filter toolbar skeleton */}
        <div className="flex flex-col gap-3">
          {/* Search + status */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-full max-w-sm" />
            <Skeleton className="h-8 w-20 shrink-0" />
          </div>
          {/* Chain pills */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-22 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </div>

        <ProposalsGridSkeleton count={9} />
      </div>
    </div>
  );
}
