import type { Metadata } from "next";
import { Suspense } from "react";
import { ProposalsGridSkeleton } from "@/components/proposals/ProposalsGrid";
import { ProposalsView } from "@/components/proposals/ProposalsView";
import { listMultiChainProposals } from "@/services/multi-chain-proposals";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Gnars Proposals — Skateboarding Grants & Funding",
  description:
    "Explore Gnars proposals to see how the community funds skateboarding grants, media, and culture-driven projects.",
  alternates: {
    canonical: "/proposals",
  },
  openGraph: {
    title: "Gnars Proposals — Skateboarding Grants & Funding",
    description:
      "Explore Gnars proposals to see how the community funds skateboarding grants, media, and culture-driven projects.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gnars Proposals — Skateboarding Grants & Funding",
    description:
      "Explore Gnars proposals to see how the community funds skateboarding grants, media, and culture-driven projects.",
  },
};

async function getProposals() {
  try {
    // Only fetch Base proposals by default (for performance)
    // Ethereum and Snapshot are loaded client-side when filters are activated
    return await listMultiChainProposals(200, false, false);
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
