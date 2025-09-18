import { Skeleton } from "@/components/ui/skeleton";

interface PropdatesFeedSkeletonProps {
  count?: number;
}

export function PropdatesFeedSkeleton({ count = 3 }: PropdatesFeedSkeletonProps) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading propdates feed">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </div>
  );
}
