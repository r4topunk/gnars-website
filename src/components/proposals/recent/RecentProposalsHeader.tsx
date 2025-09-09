"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RecentProposalsHeader() {
  return (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="space-y-1">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          Recent Proposals
        </CardTitle>
        <CardDescription>Latest governance proposals and their voting status</CardDescription>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/proposals">
          View All Proposals
          <ExternalLink className="w-4 h-4 ml-2" />
        </Link>
      </Button>
    </CardHeader>
  );
}


