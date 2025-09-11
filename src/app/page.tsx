import { SidebarInset } from "@/components/ui/sidebar";
import { Proposal } from "@/components/proposals/types";
import { HomeClientComponents } from "@/components/home-client-components";
import { BASE_URL } from "@/lib/config";

async function getRecentProposals() {
  try {
    const response = await fetch(`${BASE_URL}/api/proposals?limit=10`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      return [];
    }
    const data: Proposal[] = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch recent proposals:", error);
    return [];
  }
}

export default async function Home() {
  const proposals = await getRecentProposals();

  return (
    <SidebarInset>
      <main className="flex flex-1 flex-col">
        <HomeClientComponents proposals={proposals} />
      </main>
    </SidebarInset>
  );
}
