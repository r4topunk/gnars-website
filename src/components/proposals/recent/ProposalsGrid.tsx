"use client";

import { AnimatedListItem } from "@/components/common/AnimatedListItem";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { type Proposal } from "@/components/proposals/types";

interface ProposalsGridProps {
  proposals: Proposal[];
}

export function ProposalsGrid({ proposals }: ProposalsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {proposals.map((proposal, i) => (
        <AnimatedListItem key={proposal.proposalId} delayMs={i * 50}>
          <ProposalCard proposal={proposal} />
        </AnimatedListItem>
      ))}
    </div>
  );
}
