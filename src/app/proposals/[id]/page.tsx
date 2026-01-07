import { Metadata } from "next";
import { Suspense } from "react";
import {
  ProposalDetail,
  ProposalDetailSkeleton,
} from "@/components/proposals/detail/ProposalDetail";
import { Proposal } from "@/components/proposals/types";
import { extractFirstUrl, normalizeImageUrl } from "@/components/proposals/utils";
import { BASE_URL } from "@/lib/config";
import { PROPOSALS_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";
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

export async function generateMetadata({ params }: ProposalPageProps): Promise<Metadata> {
  const { id } = await params;
  const proposal = await fetchProposalData(id);

  if (!proposal) {
    return {
      title: "Proposal Not Found | Gnars DAO",
      description: "The proposal you're looking for doesn't exist.",
    };
  }

  // Extract image from proposal description (markdown images or URLs)
  const proposalImageUrl = normalizeImageUrl(extractFirstUrl(proposal.description));
  const imageUrl = proposalImageUrl || PROPOSALS_MINIAPP_EMBED_CONFIG.imageUrl;

  // Truncate description for metadata
  const description = proposal.description
    ? proposal.description.slice(0, 160) + (proposal.description.length > 160 ? "..." : "")
    : `Vote on Proposal #${proposal.proposalNumber}: ${proposal.title}`;

  const proposalUrl = `${BASE_URL}/proposals/${id}`;

  const miniappEmbed = {
    ...PROPOSALS_MINIAPP_EMBED_CONFIG,
    imageUrl,
    button: {
      ...PROPOSALS_MINIAPP_EMBED_CONFIG.button,
      title: `Proposal #${proposal.proposalNumber}`,
      action: {
        ...PROPOSALS_MINIAPP_EMBED_CONFIG.button.action,
        url: proposalUrl,
      },
    },
  };

  return {
    title: `Proposal #${proposal.proposalNumber}: ${proposal.title} | Gnars DAO`,
    description,
    openGraph: {
      title: `Proposal #${proposal.proposalNumber}: ${proposal.title}`,
      description,
      images: [imageUrl],
      type: "article",
      url: proposalUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: `Proposal #${proposal.proposalNumber}: ${proposal.title}`,
      description,
      images: [imageUrl],
    },
    // Farcaster mini app embed with proposal-specific image
    other: {
      "fc:miniapp": JSON.stringify(miniappEmbed),
    },
  };
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
