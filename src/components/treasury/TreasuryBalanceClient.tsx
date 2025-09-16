"use client";

import { CountUp } from "@/components/ui/count-up";

export interface TreasuryBalanceClientProps {
  metric: "total" | "eth" | "auctions";
  value?: number;
  error?: string | null;
}

export function TreasuryBalanceClient({ metric, value, error }: TreasuryBalanceClientProps) {
  if (error) {
    return <div className="text-sm text-destructive">Error: {error}</div>;
  }

  if (value === undefined) {
    return <div className="text-muted-foreground">No data available</div>;
  }

  if (metric === "total") {
    return (
      <div className="text-2xl font-semibold text-foreground">
        $
        <CountUp value={value} decimals={2} className="tabular-nums" />
      </div>
    );
  }

  return (
    <div className="text-2xl font-semibold text-foreground">
      <CountUp value={value} decimals={4} className="tabular-nums" /> ETH
    </div>
  );
}
