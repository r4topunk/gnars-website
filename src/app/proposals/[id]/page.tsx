import { Suspense } from "react";
import {
  ProposalDetail,
  ProposalDetailSkeleton,
} from "@/components/proposals/detail/ProposalDetail";
import { Proposal } from "@/components/proposals/types";
import { getProposalByIdOrNumber } from "@/services/proposals";

export const dynamic = "force-dynamic";

async function fetchProposalData(id: string): Promise<Proposal | null> {
  try {
    return await getProposalByIdOrNumber(id);
  } catch (error) {
    console.error("Failed to fetch proposal:", error);
    return null;
  }
}

interface ProposalPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  const { id } = await params;
  const proposal = await fetchProposalData(id);

  if (!proposal) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-2xl font-bold text-muted-foreground">Proposal Not Found</h2>
        <p className="text-muted-foreground mt-2">
          The proposal you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Suspense fallback={<ProposalDetailSkeleton />}>
        <ProposalDetail proposal={proposal} />
      </Suspense>
    </div>
  );
}
