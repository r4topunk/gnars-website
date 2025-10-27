"use client";

import { PastAuctions } from "@/components/auctions/PastAuctions";
import { useAllAuctions } from "@/hooks/use-auctions";

export default function AuctionsPage() {
  const { data: allAuctions, isLoading } = useAllAuctions();

  return (
    <div className="flex flex-1 flex-col py-8">
      <div className="space-y-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Auctions</h1>
          <p className="text-muted-foreground">
            Complete history of all Gnars auctions, including those with no bids
          </p>
        </div>

        <PastAuctions auctions={allAuctions} loading={isLoading} gridOnly />
      </div>
    </div>
  );
}
