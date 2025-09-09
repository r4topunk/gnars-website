"use client";

import { ProposalCard } from "@/components/proposals/ProposalCard";
import { type Proposal } from "@/components/proposals/types";

interface ProposalsGridProps {
  proposals: Proposal[];
}

export function ProposalsGrid({ proposals }: ProposalsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {proposals.map((proposal, i) => (
        <div
          key={proposal.proposalId}
          className="motion-safe:animate-in motion-safe:fade-in-50 motion-safe:slide-in-from-bottom-1"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <ProposalCard proposal={proposal} />
        </div>
      ))}
    </div>
  );
}


