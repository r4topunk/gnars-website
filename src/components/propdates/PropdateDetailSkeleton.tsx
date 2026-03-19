import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PropdateDetailSkeleton() {
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
