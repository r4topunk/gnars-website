"use client";

import Link from "next/link";
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
            These skateboarding auctions help fund skate culture, community funded skate art, and
            projects backed by the Gnars collective.
          </p>
          <p className="text-muted-foreground mt-2">
            Want to see what gets funded? Browse{" "}
            <Link href="/proposals" className="text-foreground underline underline-offset-4">
              skateboarding grants
            </Link>{" "}
            or learn{" "}
            <Link href="/about" className="text-foreground underline underline-offset-4">
              how the collective works
            </Link>
            .
          </p>
        </div>

        <PastAuctions auctions={allAuctions} loading={isLoading} gridOnly />
      </div>
    </div>
  );
}
