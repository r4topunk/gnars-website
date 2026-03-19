import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LayoutTemplate } from "lucide-react";
import { ProposalWizard } from "@/components/proposals/ProposalWizard";

export const metadata: Metadata = {
  title: "Create Proposal — Gnars DAO",
  description: "Submit a new proposal to Gnars DAO for community voting and funding.",
  alternates: {
    canonical: "/propose",
  },
  openGraph: {
    title: "Create Proposal — Gnars DAO",
    description: "Submit a new proposal to Gnars DAO for community voting and funding.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Proposal — Gnars DAO",
    description: "Submit a new proposal to Gnars DAO for community voting and funding.",
  },
};

export default function ProposePage() {
  return (
    <div className="py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Proposal</h1>
          <p className="text-muted-foreground mt-2">Create a new proposal for the Gnars DAO</p>
        </div>
        <Link
          href="/propose/templates"
          className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          <LayoutTemplate className="h-4 w-4" />
          Use a template
        </Link>
      </div>

      <Suspense>
        <ProposalWizard />
      </Suspense>
    </div>
  );
}
