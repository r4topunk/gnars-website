import { Skeleton } from "@/components/ui/skeleton";
import { BlogCardSkeleton } from "./BlogCardSkeleton";

export function BlogsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header and search skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Skeleton className="h-9 w-24 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-full sm:w-72" />
        </div>
      </div>

      {/* Blog cards grid skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <BlogCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
