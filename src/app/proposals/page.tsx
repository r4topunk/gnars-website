import { Suspense } from "react";
import { ProposalsGridSkeleton } from "@/components/proposals/ProposalsGrid";
import { ProposalsView } from "@/components/proposals/ProposalsView";
import { listProposals } from "@/services/proposals";

export const revalidate = 60;

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
    <div className="py-8">
      <Suspense fallback={<ProposalsGridSkeleton />}>
        <ProposalsView proposals={proposals} />
      </Suspense>
    </div>
  );
}
