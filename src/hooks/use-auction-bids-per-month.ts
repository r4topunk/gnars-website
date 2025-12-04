import { useMemo } from "react";
import { useAllAuctions } from "./use-auctions";

export type AuctionBidMonthPoint = {
  month: string;
  value: number; // Total ETH bid value for the month
};

/**
 * Hook to aggregate auction bid values by month
 * @param months - Number of months to display (default 12)
 * @returns Array of { month, value } points for the last N months
 */
export function useAuctionBidsPerMonth(months: number = 12) {
  const { data: auctions = [], isLoading, error } = useAllAuctions();

  const points = useMemo(() => {
    if (!auctions.length) return [];

    // Get the date range for the last N months
    const now = new Date();
    const monthsAgo = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Filter auctions within the date range
    const filteredAuctions = auctions.filter((a) => a.endTime >= monthsAgo);

    // Group by month and sum values
    const monthMap = new Map<string, number>();

    // Initialize all months with 0
    // Use month-year combo as internal key, but display just month name
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`; // internal key
      monthMap.set(key, 0);
    }

    // Sum bid values per month
    for (const auction of filteredAuctions) {
      const d = auction.endTime;
      const key = `${d.getFullYear()}-${d.getMonth()}`; // internal key
      const currentValue = monthMap.get(key) ?? 0;
      const bidValue = parseFloat(auction.finalBid) || 0;
      monthMap.set(key, currentValue + bidValue);
    }

    // Convert to array, sorted chronologically
    const result: AuctionBidMonthPoint[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`; // internal key
      const displayMonth = d.toLocaleDateString("en-US", { month: "short" }); // Just "Jan", "Feb", etc.
      result.push({
        month: displayMonth,
        value: Number((monthMap.get(key) ?? 0).toFixed(3)),
      });
    }

    return result;
  }, [auctions, months]);

  const totalValue = useMemo(() => {
    return points.reduce((sum, p) => sum + p.value, 0);
  }, [points]);

  return {
    data: points,
    totalValue,
    isLoading,
    error,
  };
}
