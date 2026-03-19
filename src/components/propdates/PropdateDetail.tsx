"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PropdateCard } from "@/components/proposals/detail/PropdateCard";
import { Propdate } from "@/services/propdates";

export function PropdateDetail({ propdate }: { propdate: Propdate }) {
  return (
    <div className="space-y-6">
      <Link
        href="/propdates"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Propdates
      </Link>
      <PropdateCard propdate={propdate} />
    </div>
  );
}
