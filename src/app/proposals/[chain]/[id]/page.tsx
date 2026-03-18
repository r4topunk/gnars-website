import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ProposalDetail,
  ProposalDetailSkeleton,
} from "@/components/proposals/detail/ProposalDetail";
import { extractFirstUrl, normalizeImageUrl } from "@/components/proposals/utils";
import { BASE_URL } from "@/lib/config";
import { toOgImageUrl } from "@/lib/og-images";
import { PROPOSALS_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";
import { getMultiChainProposal, type MultiChainProposal, type ProposalSource } from "@/services/multi-chain-proposals";

export const revalidate = 60;

const VALID_CHAINS: ProposalSource[] = ["base", "ethereum", "snapshot"];

async function fetchProposalData(chain: string, id: string): Promise<MultiChainProposal | null> {
  if (!VALID_CHAINS.includes(chain as ProposalSource)) {
    return null;
  }
  
  try {
    return await getMultiChainProposal(id, chain as ProposalSource);
  } catch (error) {
    console.error("Failed to fetch proposal:", error);
    return null;
  }
}

interface ProposalPageProps {
  params: Promise<{ chain: string; id: string }>;
}

export async function generateMetadata({ params }: ProposalPageProps): Promise<Metadata> {
  const { chain, id } = await params;
  const proposal = await fetchProposalData(chain, id);

  if (!proposal) {
    return {
      title: "Proposal Not Found | Gnars DAO",
      description: "The proposal you're looking for doesn't exist.",
    };
  }

  // Extract image from proposal description (markdown images or URLs)
  const proposalImageUrl = normalizeImageUrl(extractFirstUrl(proposal.description));
  const rawImageUrl = proposalImageUrl || PROPOSALS_MINIAPP_EMBED_CONFIG.imageUrl;
  const imageUrl =
    toOgImageUrl(rawImageUrl, {
      width: 1200,
      height: 630,
      fit: "cover",
    }) ?? rawImageUrl;

  // Strip markdown and create rich description
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/!\[.*?\]\(.*?\)/g, "") // Remove images
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Remove links but keep text
      .replace(/#{1,6}\s*/g, "") // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
      .replace(/\*([^*]+)\*/g, "$1") // Remove italic
      .replace(/`([^`]+)`/g, "$1") // Remove inline code
      .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
      .replace(/^\s*>\s+/gm, "") // Remove blockquotes
      .replace(/\n{2,}/g, " ") // Collapse multiple newlines
      .trim();
  };

  const cleanDescription = stripMarkdown(proposal.description);
  
  // Extract funding amount from proposal (sum of values array)
  const totalFunding = proposal.values.reduce((sum, val) => {
    const eth = parseFloat(val) / 1e18;
    return sum + eth;
  }, 0);
  const fundingStr = totalFunding > 0 ? `${totalFunding.toFixed(2)} ETH` : null;

  // Calculate deadline for active proposals
  const getTimeUntil = (endDate: string): string => {
    const now = new Date();
    const end = new Date(endDate);
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Ended";
    if (diffDays === 0) return "Ends today";
    if (diffDays === 1) return "Ends tomorrow";
    if (diffDays <= 7) return `Ends in ${diffDays} days`;
    return `Ends ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  // Build compelling description based on status
  let description = "";
  
  if (proposal.status === "Active") {
    const deadline = getTimeUntil(proposal.voteEnd);
    const votes = `${proposal.forVotes} FOR, ${proposal.againstVotes} AGAINST`;
    const prefix = fundingStr ? `${fundingStr} · ${deadline} · ${votes}` : `${deadline} · ${votes}`;
    description = `${prefix} | ${cleanDescription.slice(0, 100)}${cleanDescription.length > 100 ? "..." : ""}`;
  } else if (proposal.status === "Executed" && fundingStr) {
    description = `Executed · ${fundingStr} allocated | ${cleanDescription.slice(0, 120)}${cleanDescription.length > 120 ? "..." : ""}`;
  } else if (proposal.status === "Succeeded" && fundingStr) {
    description = `Passed · ${fundingStr} pending execution | ${cleanDescription.slice(0, 110)}${cleanDescription.length > 110 ? "..." : ""}`;
  } else {
    const prefix = fundingStr ? `${proposal.status} · ${fundingStr}` : proposal.status;
    description = `${prefix} | ${cleanDescription.slice(0, 130)}${cleanDescription.length > 130 ? "..." : ""}`;
  }

  const chainLabel = chain.charAt(0).toUpperCase() + chain.slice(1);
  const proposalUrl = `${BASE_URL}/proposals/${chain}/${id}`;

  return {
    title: `Proposal #${proposal.proposalNumber}: ${proposal.title} | Gnars DAO`,
    description,
    alternates: {
      canonical: `/proposals/${chain}/${id}`,
    },
    openGraph: {
      title: `[${chainLabel}] Proposal #${proposal.proposalNumber}: ${proposal.title}`,
      description,
      images: [imageUrl],
      type: "article",
      url: proposalUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: `[${chainLabel}] Proposal #${proposal.proposalNumber}: ${proposal.title}`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  const { chain, id } = await params;
  const proposal = await fetchProposalData(chain, id);

  if (!proposal) {
    notFound();
  }

  return (
    <div className="py-8">
      <Suspense fallback={<ProposalDetailSkeleton />}>
        <ProposalDetail proposal={proposal} />
      </Suspense>
    </div>
  );
}
