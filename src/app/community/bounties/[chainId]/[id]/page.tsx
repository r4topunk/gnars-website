import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPoidhBounty } from "@/services/poidh";
import { BountyDetailView } from "@/components/bounties/BountyDetailView";
import { Skeleton } from "@/components/ui/skeleton";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ chainId: string; id: string }>;
}

function parseParams(params: { chainId: string; id: string }) {
  return {
    chainId: parseInt(params.chainId, 10),
    bountyId: parseInt(params.id, 10),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { chainId, bountyId } = parseParams(await params);
  const bounty = await fetchPoidhBounty(chainId, bountyId);

  if (!bounty) {
    return { title: "Bounty Not Found — Gnars" };
  }

  const title = `${bounty.title || bounty.name} — Gnars Challenges`;
  const description = (bounty.description || "").slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function DetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Skeleton className="h-8 w-32 mb-6" />
      <Skeleton className="h-12 w-3/4 mb-4" />
      <Skeleton className="h-24 w-full mb-8" />
      <div className="grid md:grid-cols-3 gap-6">
        <Skeleton className="h-48 col-span-2" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

export default async function BountyDetailPage({ params }: PageProps) {
  const { chainId, bountyId } = parseParams(await params);
  const bounty = await fetchPoidhBounty(chainId, bountyId);

  if (!bounty) {
    notFound();
  }

  return (
    <Suspense fallback={<DetailSkeleton />}>
      <BountyDetailView
        initialBounty={bounty}
        chainId={chainId}
        bountyId={bountyId}
      />
    </Suspense>
  );
}
