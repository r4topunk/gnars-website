import { Suspense } from "react";
import { DelegatesList } from "@/components/delegates-list";
import { MembersList } from "@/components/members-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const revalidate = 3600; // ISR with 1 hour revalidation

interface MembersPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = (await searchParams) || {};
  const search = typeof params.search === "string" ? params.search : "";
  const tab = typeof params.tab === "string" ? params.tab : "members";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Members & Delegates</h1>
          <p className="text-muted-foreground mt-2">
            Explore Gnars DAO members and their voting delegates
          </p>
        </div>

        <Tabs defaultValue={tab} className="space-y-6">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="delegates">Delegates</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gnar Holders</CardTitle>
                <CardDescription>All current holders of Gnar NFTs in the DAO</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<MembersTableSkeleton />}>
                  <MembersList searchTerm={search} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delegates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voting Delegates</CardTitle>
                <CardDescription>
                  Accounts with delegated voting power, sorted by vote count
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<DelegatesTableSkeleton />}>
                  <DelegatesList />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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

function DelegatesTableSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-4 py-3 border-b">
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 py-3">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
