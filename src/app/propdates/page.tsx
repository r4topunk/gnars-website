import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PropdatesFeed } from "@/components/propdates/PropdatesFeed";
import { PropdatesFeedSkeleton } from "@/components/propdates/PropdatesFeedSkeleton";

export const metadata: Metadata = {
  title: "Propdates — Gnars DAO",
  description: "Progress updates and reports on funded Gnars DAO proposals.",
  alternates: { canonical: "/propdates" },
  openGraph: {
    title: "Propdates — Gnars DAO",
    description: "Progress updates and reports on funded Gnars DAO proposals.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Propdates — Gnars DAO",
    description: "Progress updates and reports on funded Gnars DAO proposals.",
  },
};

export const revalidate = 60;

export default function PropdatesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Propdates</h1>
        <p className="text-muted-foreground mt-1">
          Progress updates from funded proposals. See how the community is delivering on their commitments.{" "}
          <Link
            href="/proposals"
            className="text-foreground underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground transition-colors"
          >
            View proposals
          </Link>
        </p>
      </div>
      <Suspense fallback={<PropdatesFeedSkeleton />}>
        <PropdatesFeed />
      </Suspense>
    </div>
  );
}
