import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PropdateDetail } from "@/components/propdates/PropdateDetail";
import { PropdateDetailSkeleton } from "@/components/propdates/PropdateDetailSkeleton";
import { getPropdateByTxid } from "@/services/propdates";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ txid: string }>;
}

export default function PropdatePage({ params }: PageProps) {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Propdate</h1>
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
