import { ProposalDetailSkeleton } from "@/components/proposals/detail/ProposalDetail";

export default function Loading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <ProposalDetailSkeleton />
    </div>
  );
}


