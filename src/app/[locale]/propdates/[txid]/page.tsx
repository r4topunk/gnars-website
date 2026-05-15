import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropdateDetail } from "@/components/propdates/PropdateDetail";
import { PropdateDetailSkeleton } from "@/components/propdates/PropdateDetailSkeleton";
import { getPropdateByTxid } from "@/services/propdates";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ txid: string; locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { txid, locale } = await params;
  const path = `/propdates/${txid}`;
  const canonical = locale === "en" ? path : `/pt-br${path}`;
  return {
    alternates: {
      canonical,
      languages: {
        en: path,
        "pt-br": `/pt-br${path}`,
        "x-default": path,
      },
    },
  };
}

export default function PropdatePage({ params }: PageProps) {
  return (
    <div className="py-8">
      <Suspense fallback={<PropdateDetailSkeleton />}>
        <PropdateContent params={params} />
      </Suspense>
    </div>
  );
}

async function PropdateContent({ params }: { params: Promise<{ txid: string }> }) {
  const { txid } = await params;
  const propdate = await getPropdateByTxid(txid);

  if (!propdate) {
    notFound();
  }

  return <PropdateDetail propdate={propdate} />;
}
