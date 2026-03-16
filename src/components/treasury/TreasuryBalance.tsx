import { loadTreasurySnapshot } from "@/services/treasury";
import { TreasuryBalanceClient } from "./TreasuryBalanceClient";

interface TreasuryBalanceProps {
  treasuryAddress: string;
  metric?: "total" | "eth" | "auctions";
}

export async function TreasuryBalance({ treasuryAddress, metric = "total" }: TreasuryBalanceProps) {
  try {
    const snapshot = await loadTreasurySnapshot(treasuryAddress);
    const value =
      metric === "total"
        ? snapshot.usdTotal
        : metric === "eth"
          ? snapshot.ethBalance
          : snapshot.totalAuctionSales;

    return <TreasuryBalanceClient metric={metric} value={value} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load treasury data";
    return <TreasuryBalanceClient metric={metric} error={message} />;
  }
}
