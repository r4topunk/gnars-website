"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/common/SectionHeader";

export function RecentProposalsHeader() {
  return (
    <SectionHeader
      title="Recent Proposals"
      description="Governance proposals and their voting status"
      action={
        <Button variant="outline" size="sm" asChild>
          <Link href="/proposals">
            View All Proposals
            <ArrowRightIcon className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      }
    />
  );
}


