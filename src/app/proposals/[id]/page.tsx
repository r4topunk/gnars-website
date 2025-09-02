import { ProposalDetail } from "@/components/proposals/detail/ProposalDetail";

interface ProposalPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-8 px-4">
      <ProposalDetail proposalId={id} />
    </div>
  );
}
