import { SidebarInset } from "@/components/ui/sidebar";
import { Proposal } from "@/components/proposals/types";
import { HomeClientComponents } from "@/components/home-client-components";

async function fetchRecentProposals(): Promise<Proposal[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/proposals?limit=10`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
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
  const proposals = await fetchRecentProposals();

  return (
    <SidebarInset>
      <main className="flex flex-1 flex-col">
        <HomeClientComponents proposals={proposals} />
      </main>
    </SidebarInset>
  );
}
