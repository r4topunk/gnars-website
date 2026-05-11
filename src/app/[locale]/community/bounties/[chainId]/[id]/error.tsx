"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BountyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Bounty detail page error:", error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      <p className="text-muted-foreground mb-8">
        We hit an error loading this bounty. The POIDH service may be having issues.
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" onClick={reset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
        <Button asChild variant="ghost">
          <Link href="/community/bounties">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bounties
          </Link>
        </Button>
      </div>
    </div>
  );
}
