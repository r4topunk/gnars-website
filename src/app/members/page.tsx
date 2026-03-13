import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Members — Gnars DAO",
  description:
    "Browse all Gnars DAO members and their voting delegates. See who holds Gnars NFTs and how governance power is distributed across the community.",
  alternates: {
    canonical: "/members",
  },
  openGraph: {
    title: "Members — Gnars DAO",
    description: "Browse all Gnars DAO members and their voting delegates. See who holds Gnars NFTs and how governance power is distributed across the community.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Members — Gnars DAO",
    description: "Browse all Gnars DAO members and their voting delegates. See who holds Gnars NFTs and how governance power is distributed across the community.",
  },
};
import { MembersList } from "@/components/members/MembersList";
import { MembersTableSkeleton } from "@/components/skeletons/members-table-skeleton";

export const revalidate = 3600; // ISR with 1 hour revalidation

export default async function MembersPage() {
  return (
    <div className="py-8">
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
