import Link from "next/link";
import { DroposalsGrid } from "@/components/droposals/DroposalsGrid";
import { fetchDroposals } from "@/services/droposals";

export const revalidate = 1800; // 30 minutes

export default async function DroposalsPage() {
  const items = await fetchDroposals(24);

  return (
    <div className="py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gnars Drops</h1>
        <p className="text-muted-foreground mt-1">
          Drops are Gnarly Highquality videos or assets created and approved by the community. In
          order to create a Drop you need to create a droposal.
        </p>
        <p className="text-muted-foreground mt-2">
          Droposals are community proposals that green‑light new drops and skate media. See{" "}
          <Link href="/proposals" className="text-foreground underline underline-offset-4">
            funding decisions
          </Link>{" "}
          or learn{" "}
          <Link href="/about" className="text-foreground underline underline-offset-4">
            how Gnars works
          </Link>
          .
        </p>
      </div>
      <DroposalsGrid items={items} />
    </div>
  );
}
