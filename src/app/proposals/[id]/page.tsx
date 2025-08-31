import { ProposalDetail } from "@/components/proposal-detail";

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
