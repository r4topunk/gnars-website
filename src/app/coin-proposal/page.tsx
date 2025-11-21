import { CoinProposalWizard } from "@/components/coin-proposal/CoinProposalWizard";

export default function CoinProposalPage() {
  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Coin Purchase Proposal</h1>
        <p className="text-muted-foreground mt-2">
          Create a DAO proposal to buy content or creator coins using Zora Coins SDK
        </p>
      </div>

      <CoinProposalWizard />
    </div>
  );
}
