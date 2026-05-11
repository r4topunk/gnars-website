import { RecentProposals } from "@/components/proposals/recent/RecentProposals";
import { ProposalStatus } from "@/lib/schemas/proposals";
import { listProposals } from "@/services/proposals";

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
