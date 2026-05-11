import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProposalsGridSkeleton } from "@/components/proposals/ProposalsGrid";
import { ProposalsView } from "@/components/proposals/ProposalsView";
import { listMultiChainProposals } from "@/services/multi-chain-proposals";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata.proposals" });
  const path = "/proposals";
  const canonical = locale === "en" ? path : `/pt-br${path}`;
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: {
        en: path,
        "pt-br": `/pt-br${path}`,
        "x-default": path,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

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
