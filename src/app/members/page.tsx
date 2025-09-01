import { Suspense } from "react";
import { MembersList } from "@/components/members-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const revalidate = 3600; // ISR with 1 hour revalidation

interface MembersPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = (await searchParams) || {};
  const search = typeof params.search === "string" ? params.search : "";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground mt-2">
            Explore Gnars DAO members and their voting delegates
          </p>
        </div>

        <Suspense fallback={<MembersTableSkeleton />}>
          <MembersList showSearch={false} />
        </Suspense>
      </div>
    </div>
  );
}

function MembersTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search input skeleton */}
      <Skeleton className="h-10 w-full max-w-sm" />

      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="flex items-center space-x-4 py-3 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 py-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

 
