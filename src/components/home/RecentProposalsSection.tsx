import { RecentProposals } from "@/components/proposals/recent/RecentProposals";
import { listProposals } from "@/services/proposals";
import { ProposalStatus } from "@/lib/schemas/proposals";

interface RecentProposalsSectionProps {
  limit?: number;
  excludeStatuses?: ProposalStatus[];
}

export async function RecentProposalsSection({
  limit = 6,
  excludeStatuses = [ProposalStatus.CANCELLED],
}: RecentProposalsSectionProps) {
  // Fetch a few extra to account for filtered statuses
  const proposals = await listProposals(limit + 5);

  return (
    <RecentProposals
      proposals={proposals}
      limit={limit}
      excludeStatuses={excludeStatuses}
      showRequested={false}
    />
  );
}
