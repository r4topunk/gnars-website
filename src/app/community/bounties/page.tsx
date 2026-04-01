import { Suspense } from "react";
import type { PoidhBounty } from "@/types/poidh";
import { fetchPoidhBounties } from "@/services/poidh";
import { BountiesView } from "@/components/bounties/BountiesView";
import { BountyGridSkeleton } from "@/components/bounties/BountyGrid";

export const revalidate = 60;

export default async function BountiesPage() {
  let bounties: PoidhBounty[] = [];
  try {
    const data = await fetchPoidhBounties({ status: "open" });
    bounties = data.bounties;
  } catch {
    // POIDH API down — render empty, client will retry
  }

  return (
    <Suspense fallback={<BountyGridSkeleton />}>
      <BountiesView initialBounties={bounties} />
    </Suspense>
  );
}
