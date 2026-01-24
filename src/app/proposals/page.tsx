import type { Metadata } from "next";
import { Suspense } from "react";
import { ProposalsGridSkeleton } from "@/components/proposals/ProposalsGrid";
import { ProposalsView } from "@/components/proposals/ProposalsView";
import { listProposals } from "@/services/proposals";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Gnars Proposals — Skateboarding Grants & Funding",
  description:
    "Explore Gnars proposals to see how the community funds skateboarding grants, media, and culture-driven projects.",
  alternates: {
    canonical: "/proposals",
  },
};

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
