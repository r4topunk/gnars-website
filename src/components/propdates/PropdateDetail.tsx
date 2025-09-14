"use client";

import { PropdateCard } from "@/components/proposals/detail/PropdateCard";
import { Propdate } from "@/services/propdates";

export function PropdateDetail({ propdate }: { propdate: Propdate }) {
  return <PropdateCard propdate={propdate} />;
}
