import { ProposalDetail, ProposalDetailSkeleton } from "@/components/proposals/detail/ProposalDetail";
import { Proposal } from "@/components/proposals/types";
import { Suspense } from "react";
import { proposalSchema } from "@/lib/schemas/proposals";

async function fetchProposalData(id: string): Promise<Proposal | null> {
  try {
    // Using an absolute URL is recommended for server-side fetching in Next.js
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/proposals/${id}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const validation = proposalSchema.safeParse(data);
    if (!validation.success) {
      console.error("Failed to validate proposal:", validation.error);
      return null;
    }
    return validation.data;
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
      <div className="container mx-auto py-8 px-4 text-center">
        <h2 className="text-2xl font-bold text-muted-foreground">Proposal Not Found</h2>
        <p className="text-muted-foreground mt-2">
          The proposal you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense fallback={<ProposalDetailSkeleton />}>
        <ProposalDetail proposal={proposal} />
      </Suspense>
    </div>
  );
}
