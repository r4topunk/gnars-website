import { Suspense } from "react";
import { MembersList } from "@/components/members/MembersList";
import { MembersTableSkeleton } from "@/components/skeletons/members-table-skeleton";
import { SidebarInset } from "@/components/ui/sidebar";

export const revalidate = 3600; // ISR with 1 hour revalidation

export default async function MembersPage() {
  return (
    <SidebarInset>
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
    </SidebarInset>
  );
}
