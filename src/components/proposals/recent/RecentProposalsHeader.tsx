"use client";

import { ArrowRightIcon } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

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
