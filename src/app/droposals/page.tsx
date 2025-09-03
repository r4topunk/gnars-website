import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DroposalsGrid } from "@/components/droposals/DroposalsGrid";
import { fetchDroposals } from "@/services/droposals";
import { Separator } from "@/components/ui/separator";

export const revalidate = 1800; // 30 minutes

export default async function DroposalsPage() {
  const items = await fetchDroposals(24);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Droposals</h1>
        <p className="text-muted-foreground mt-1">Discover and collect community NFT drops</p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>All Droposals</CardTitle>
        </CardHeader>
        <CardContent>
          <DroposalsGrid items={items} />
        </CardContent>
      </Card>
    </div>
  );
}


