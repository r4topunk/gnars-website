import Link from "next/link";
import { Button } from "@/components/ui/button";

export function NogglesRailsManifesto() {
  return (
    <section className="border-t py-12 text-center">
      <p className="mx-auto max-w-lg text-muted-foreground">
        Want to bring a NogglesRail to your city? Submit a proposal and the
        community will fund it.
      </p>
      <Button asChild className="mt-4">
        <Link href="/propose">Submit a Proposal</Link>
      </Button>
    </section>
  );
}
