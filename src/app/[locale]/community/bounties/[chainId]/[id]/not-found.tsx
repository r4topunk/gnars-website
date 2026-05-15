import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BountyNotFound() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Bounty unavailable</h1>
      <p className="text-muted-foreground mb-2">
        We couldn&apos;t load this bounty. It may not exist, or the POIDH service may be temporarily
        down.
      </p>
      <p className="text-sm text-muted-foreground mb-8">
        Try again in a few minutes, or check{" "}
        <a
          href="https://poidh.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          poidh.xyz
        </a>{" "}
        for status.
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button asChild variant="outline">
          <Link href="/community/bounties">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bounties
          </Link>
        </Button>
      </div>
    </div>
  );
}
