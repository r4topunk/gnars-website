import { ProposalWizard } from "@/components/proposals/ProposalWizard";
import { SidebarInset } from "@/components/ui/sidebar";

export default function ProposePage() {
  return (
    <SidebarInset>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Create Proposal</h1>
          <p className="text-muted-foreground mt-2">Create a new proposal for the Gnars DAO</p>
        </div>

        <ProposalWizard />
      </div>
    </SidebarInset>
  );
}
