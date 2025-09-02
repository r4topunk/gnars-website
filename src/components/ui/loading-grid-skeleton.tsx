import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingGridSkeletonProps {
  items?: number;
  withCard?: boolean;
  aspectClassName?: string;
  containerClassName?: string;
}

export function LoadingGridSkeleton({
  items = 8,
  withCard = true,
  aspectClassName = "aspect-square",
  containerClassName = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
}: LoadingGridSkeletonProps) {
  const Item = ({ index }: { index: number }) => {
    const content = (
      <div className="p-4">
        <Skeleton className={`${aspectClassName} w-full mb-3 rounded-lg`} />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    );
    return withCard ? (
      <Card key={index}>
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    ) : (
      <div key={index} className="p-0">{content}</div>
    );
  };

  return (
    <div className={containerClassName}>
      {Array.from({ length: items }).map((_, i) => (
        <Item key={i} index={i} />
      ))}
    </div>
  );
}
