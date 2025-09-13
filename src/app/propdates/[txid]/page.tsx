import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPropdateByTxid } from "@/services/propdates";
import { PropdateDetail } from "@/components/propdates/PropdateDetail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ txid: string }>;
}

export default async function PropdatePage({ params }: PageProps) {
  const { txid } = await params;
  const propdate = await getPropdateByTxid(txid);

  if (!propdate) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Propdate</h1>
      <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
        {/* Client detail component */}
        <PropdateDetail propdate={propdate} />
      </Suspense>
    </div>
  );
}
