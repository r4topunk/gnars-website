import { ProposalsView } from "@/components/proposals/ProposalsView";
import { Proposal } from "@/components/proposals/types";
import { Suspense } from "react";
import { ProposalsGridSkeleton } from "@/components/proposals/ProposalsGrid";
import { proposalSchema } from "@/lib/schemas/proposals";
import { z } from "zod";
import { BASE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";

async function getProposals() {
  try {
    const response = await fetch(`${BASE_URL}/api/proposals`, {
      next: { revalidate: 300 }, // Revalidate every 5 minutes
    });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    const validation = z.array(proposalSchema).safeParse(data);
    if (!validation.success) {
      console.error("Failed to validate proposals:", validation.error);
      return [];
    }
    return validation.data;
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
