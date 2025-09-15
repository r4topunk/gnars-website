import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export function BlogCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="mx-4 border rounded-md overflow-hidden">
        <AspectRatio ratio={16 / 9}>
          <Skeleton className="absolute inset-0" />
        </AspectRatio>
      </div>

      <CardContent className="px-4 py-4">
        <div className="space-y-3">
          <div className="space-y-2">
            {/* Title skeleton - 2 lines */}
            <div className="space-y-1">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>

            {/* Preview text skeleton - 3 lines */}
            <div className="space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>

          {/* Footer with author and date */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}