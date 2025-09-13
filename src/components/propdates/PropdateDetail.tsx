"use client";

import { Propdate } from "@/services/propdates";
import { PropdateCard } from "@/components/proposals/detail/PropdateCard";

export function PropdateDetail({ propdate }: { propdate: Propdate }) {
  return <PropdateCard propdate={propdate} />;
}
