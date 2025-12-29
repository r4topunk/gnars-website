import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function HeroStatsSkeleton() {
  return (
    <div className="flex flex-wrap gap-4 pt-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    </div>
  );
}

export function RecentProposalsSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ActivityFeedSkeleton({ responsive = false }: { responsive?: boolean } = {}) {
  return (
    <Card className={responsive ? "h-full flex flex-col" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </CardHeader>
      <CardContent className={responsive ? "flex-1 min-h-0 flex flex-col" : ""}>
        <div
          className={`overflow-y-auto rounded-lg border bg-background/50 p-4 space-y-4 ${
            responsive ? "flex-1 min-h-0" : "max-h-[500px]"
          }`}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
