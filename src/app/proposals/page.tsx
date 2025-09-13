import { ProposalsView } from "@/components/proposals/ProposalsView";
import { Proposal } from "@/components/proposals/types";
import { Suspense } from "react";
import { ProposalsGridSkeleton } from "@/components/proposals/ProposalsGrid";
import { listProposals } from "@/services/proposals";

export const dynamic = "force-dynamic";

async function getProposals() {
  try {
    return await listProposals(200, 0);
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return [];
  }
}

export default async function ProposalsPage() {
  const proposals = await getProposals();

  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense fallback={<ProposalsGridSkeleton />}>
        <ProposalsView proposals={proposals} />
      </Suspense>
    </div>
  );
}
