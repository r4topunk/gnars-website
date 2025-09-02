"use client";

import { ProposalCard } from "@/components/proposal-card";
import { type Proposal } from "@/components/proposals/types";

interface ProposalsGridProps {
  proposals: Proposal[];
}

export function ProposalsGrid({ proposals }: ProposalsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {proposals.map((proposal) => (
        <ProposalCard key={proposal.proposalId} proposal={proposal} />
      ))}
    </div>
  );
}


