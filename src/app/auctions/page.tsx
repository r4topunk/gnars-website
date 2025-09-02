"use client";

import { PastAuctions } from "@/components/auctions/PastAuctions";
import { SidebarInset } from "@/components/ui/sidebar";
import { useAllAuctions } from "@/hooks/use-auctions";

export default function AuctionsPage() {
  const { data: allAuctions, isLoading } = useAllAuctions();

  return (
    <SidebarInset>
      <main className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-6 py-4">
          <section>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">All Auctions</h1>
              <p className="text-muted-foreground">
                Complete history of all Gnars auctions, including those with no bids
              </p>
            </div>

            <PastAuctions auctions={allAuctions} loading={isLoading} gridOnly />
          </section>
        </div>
      </main>
    </SidebarInset>
  );
}
