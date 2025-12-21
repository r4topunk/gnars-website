"use client";

import { CountUp } from "@/components/ui/count-up";
import { Skeleton } from "@/components/ui/skeleton";

export interface TreasuryBalanceClientProps {
  metric: "total" | "eth" | "auctions";
  value?: number;
  error?: string | null;
}

export function TreasuryBalanceClient({ metric, value, error }: TreasuryBalanceClientProps) {
  const isUsd = metric === "total";
  const decimals = isUsd ? 2 : 4;
  const prefix = isUsd ? "$" : "";
  const suffix = isUsd ? "" : " ETH";

  if (error) {
    return (
      <div className="text-2xl font-semibold text-destructive">
        Error
      </div>
    );
  }

  if (value === undefined) {
    return <Skeleton className="h-8 w-32" />;
  }

  return (
    <div className="text-2xl font-semibold text-foreground">
      {prefix}
      <CountUp value={value} decimals={decimals} className="tabular-nums" />
      {suffix}
    </div>
  );
}
