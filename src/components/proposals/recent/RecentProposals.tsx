import { RecentProposalsEmptyState } from "@/components/proposals/recent/EmptyState";
import { ProposalsGrid } from "@/components/proposals/recent/ProposalsGrid";
import { RecentProposalsHeader } from "@/components/proposals/recent/RecentProposalsHeader";
import { Proposal } from "@/components/proposals/types";
import { Card, CardContent } from "@/components/ui/card";
import { ProposalStatus } from "@/lib/schemas/proposals";

// Re-export for backwards compatibility
export { type Proposal } from "@/components/proposals/types";
export { ProposalStatus } from "@/lib/schemas/proposals";

interface RecentProposalsProps {
  proposals: Proposal[];
  limit?: number;
  excludeStatuses?: ProposalStatus[];
}

export function RecentProposals({
  proposals,
  limit = 6,
  excludeStatuses = [],
}: RecentProposalsProps) {
  const filtered = proposals.filter((p) => !excludeStatuses.includes(p.status));
  const displayedProposals = filtered.slice(0, limit);

  return (
    <Card className="w-full">
      <RecentProposalsHeader />
      <CardContent className="space-y-4">
        {displayedProposals.length === 0 ? (
          <RecentProposalsEmptyState />
        ) : (
          <ProposalsGrid proposals={displayedProposals} />
        )}
      </CardContent>
    </Card>
  );
}
