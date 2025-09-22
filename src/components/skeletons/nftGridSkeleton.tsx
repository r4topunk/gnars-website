import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface NftGridSkeletonProps {
  className?: string;
}

export function NftGridSkeleton({ className }: NftGridSkeletonProps) {
  return (
    <div className={cn("my-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 pr-2", className)}>
      {Array.from({ length: 18 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="relative aspect-square overflow-hidden rounded-lg bg-muted"
        >
          <Skeleton className="absolute inset-0" />
          <div className="absolute top-1.5 left-1.5">
            <Skeleton className="h-5 w-10 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}