"use client";

import { PastAuctions } from "@/components/auctions/PastAuctions";
import { SidebarInset } from "@/components/ui/sidebar";
import { useAllAuctions } from "@/hooks/use-auctions";

export default function AuctionsPage() {
  const { data: allAuctions, isLoading } = useAllAuctions();

  return (
    <SidebarInset>
      <main className="flex flex-1 flex-col">
        <div className="container mx-auto py-8 px-4">
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
      </main>
    </SidebarInset>
  );
}
