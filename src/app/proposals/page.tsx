import { ProposalsView } from "@/components/proposals/ProposalsView";
import { Proposal } from "@/components/proposals/types";
import { Suspense } from "react";
import { ProposalsGridSkeleton } from "@/components/proposals/ProposalsGrid";

async function fetchProposals(): Promise<Proposal[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/proposals`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });
    if (!response.ok) {
      return [];
    }
    const data: Proposal[] = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return [];
  }
}

export default async function ProposalsPage() {
  const proposals = await fetchProposals();

  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense fallback={<ProposalsGridSkeleton />}>
        <ProposalsView proposals={proposals} />
      </Suspense>
    </div>
  );
}
