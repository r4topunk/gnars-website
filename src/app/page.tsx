import { HomeClientComponents } from "@/components/home-client-components";
import { Proposal } from "@/components/proposals/types";
import { listProposals } from "@/services/proposals";

export const dynamic = "force-dynamic";

async function getRecentProposals(): Promise<Proposal[]> {
  try {
    const proposals = await listProposals(10, 0);
    return proposals;
  } catch (error) {
    console.error("Failed to fetch recent proposals:", error);
    return [];
  }
}

export default async function Home() {
  const proposals = await getRecentProposals();

  return (
    <div className="flex flex-1 flex-col">
      <HomeClientComponents proposals={proposals} />
    </div>
  );
}
