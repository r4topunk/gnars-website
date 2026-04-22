import { loadTreasurySnapshot } from "@/services/treasury";
import { TreasuryBalanceClient } from "./TreasuryBalanceClient";

interface TreasuryBalanceProps {
  treasuryAddress: string;
  metric?: "total" | "eth" | "auctions";
}

export async function TreasuryBalance({ treasuryAddress, metric = "total" }: TreasuryBalanceProps) {
  let value: number | undefined;
  let error: string | undefined;
  try {
    const snapshot = await loadTreasurySnapshot(treasuryAddress);
    value =
      metric === "total"
        ? snapshot.usdTotal
        : metric === "eth"
          ? snapshot.ethBalance
          : snapshot.totalAuctionSales;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load treasury data";
  }
  return <TreasuryBalanceClient metric={metric} value={value} error={error} />;
}
