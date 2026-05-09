import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingGridSkeletonProps {
  items?: number;
  withCard?: boolean;
  aspectClassName?: string;
  containerClassName?: string;
}

function SkeletonItem({
  withCard,
  aspectClassName,
}: {
  withCard: boolean;
  aspectClassName: string;
}) {
  const content = (
    <div className="p-4">
      <Skeleton className={`${aspectClassName} w-full mb-5 rounded-md`} />
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-4 w-3/4 mb-1" />
      <Skeleton className="h-3 w-1/2 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-1.5 w-full" />
        <div className="flex justify-between text-xs">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
  return withCard ? (
    <Card className="py-2">
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  ) : (
    <div className="p-0">{content}</div>
  );
}

export function LoadingGridSkeleton({
  items = 8,
  withCard = true,
  aspectClassName = "aspect-square",
  containerClassName = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
}: LoadingGridSkeletonProps) {
  return (
    <div className={containerClassName}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonItem key={i} withCard={withCard} aspectClassName={aspectClassName} />
      ))}
    </div>
  );
}
