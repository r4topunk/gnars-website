import { DroposalsGrid } from "@/components/droposals/DroposalsGrid";
import { fetchDroposals } from "@/services/droposals";

export const revalidate = 1800; // 30 minutes

export default async function DroposalsPage() {
  const items = await fetchDroposals(24);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Droposals</h1>
        <p className="text-muted-foreground mt-1">Discover and collect community NFT drops</p>
      </div>
      <DroposalsGrid items={items} />
    </div>
  );
}
