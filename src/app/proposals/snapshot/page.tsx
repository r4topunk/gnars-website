import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listSnapshotProposals } from "@/services/snapshot";
import { SnapshotProposalsView } from "@/components/snapshot/SnapshotProposalsView";
import { Button } from "@/components/ui/button";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Snapshot Proposals — Gnars DAO",
  description:
    "Explore historical Gnars Snapshot proposals — community votes and governance decisions.",
  alternates: {
    canonical: "/proposals/snapshot",
  },
};

async function getProposals() {
  try {
    return await listSnapshotProposals(100);
  } catch (error) {
    console.error("Failed to fetch Snapshot proposals:", error);
    return [];
  }
}

export default async function SnapshotProposalsPage() {
  const proposals = await getProposals();

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Snapshot Proposals</h1>
          <p className="text-muted-foreground">
            Historical community votes via Snapshot (off-chain governance).
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/proposals">← On-chain Proposals</Link>
        </Button>
      </div>
      <Suspense fallback={<div>Loading proposals...</div>}>
        <SnapshotProposalsView proposals={proposals} />
      </Suspense>
    </div>
  );
}
