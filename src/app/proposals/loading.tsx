import { ProposalsGridSkeleton } from "@/components/proposals/ProposalsGrid";

export default function Loading() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Proposals</h1>
          <p className="text-muted-foreground">
            View and participate in Gnars DAO governance proposals
          </p>
        </div>
        <ProposalsGridSkeleton />
      </div>
    </div>
  );
}
