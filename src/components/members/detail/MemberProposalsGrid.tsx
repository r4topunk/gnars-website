"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { type Proposal as UiProposal } from "@/components/proposals/types";

interface MemberProposalsGridProps {
  proposals: UiProposal[];
}

export function MemberProposalsGrid({ proposals }: MemberProposalsGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Proposals Made</CardTitle>
      </CardHeader>
      <CardContent>
        {proposals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No proposals from this member.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {proposals.map((p) => (
              <ProposalCard key={p.proposalId} proposal={p} showBanner />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


