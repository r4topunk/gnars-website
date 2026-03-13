import type { Metadata } from "next";
import { ProposalWizard } from "@/components/proposals/ProposalWizard";

export const metadata: Metadata = {
  title: "Create Proposal — Gnars DAO",
  description: "Submit a new proposal to Gnars DAO for community voting and funding.",
  alternates: {
    canonical: "/propose",
  },
};

export default function ProposePage() {
  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create Proposal</h1>
        <p className="text-muted-foreground mt-2">Create a new proposal for the Gnars DAO</p>
      </div>

      <ProposalWizard />
    </div>
  );
}
