import { ProposalsGrid } from "@/components/proposals-grid"

export default function ProposalsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Proposals</h1>
        <p className="text-muted-foreground">
          View and participate in Gnars DAO governance proposals
        </p>
      </div>
      <ProposalsGrid />
    </div>
  )
}