"use client";

import { useTranslations } from "next-intl";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { type Proposal as UiProposal } from "@/components/proposals/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MemberProposalsGridProps {
  proposals: UiProposal[];
}

export function MemberProposalsGrid({ proposals }: MemberProposalsGridProps) {
  const t = useTranslations("members");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("proposals.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {proposals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t("proposals.empty")}</div>
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
