import { Skeleton } from "@/components/ui/skeleton";

interface BarChartSkeletonProps {
  barCount?: number;
}

export function BarChartSkeleton({ barCount = 12 }: BarChartSkeletonProps) {
  // Predefined heights to simulate varying bar heights
  const heights = [60, 45, 70, 35, 55, 80, 40, 65, 50, 75, 45, 60];

  return (
    <div className="h-[200px] w-full flex flex-col justify-end p-4 pt-8">
      <div className="flex-1 flex items-end justify-between gap-1.5">
        {Array.from({ length: barCount }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 min-w-0 rounded-t-sm"
            style={{ height: `${heights[i % heights.length]}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {Array.from({ length: barCount }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-6 flex-shrink-0" />
        ))}
      </div>
    </div>
  );
}
