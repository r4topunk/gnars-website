/**
 * DashboardCharts - Treasury dashboard chart components
 * Exports individual chart components for treasury analytics
 * Components: ProposalsPerMonthChart, TreasuryAllocationChart, MemberActivityChart
 * Legacy: AuctionTrendChart (kept for reference)
 * Performance: Uses React Query for data fetching with appropriate caching
 */

// Re-export individual chart components
export { AuctionTrendChart } from "./AuctionTrendChart";
export { ProposalsPerMonthChart } from "./ProposalsPerMonthChart";
export { TreasuryAllocationChart } from "./TreasuryAllocationChart";
export { MemberActivityChart } from "./MemberActivityChart";
