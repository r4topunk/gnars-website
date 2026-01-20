/**
 * Shared utilities and constants for OG image rendering
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// Dark theme colors (consistent with existing member OG)
export const OG_COLORS = {
  background: "#000",
  foreground: "#fff",
  card: "#111",
  cardBorder: "#222",
  muted: "#888",
  mutedLight: "#aaa",
  accent: "#22c55e", // Green for positive/success
  accentYellow: "#fbbf24", // Yellow for special highlights
  destructive: "#ef4444", // Red for negative/against
  blue: "#488bf4", // For links/info
} as const;

// Status colors for proposals
export const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  Active: "#22c55e",
  Pending: "#fbbf24",
  Succeeded: "#22c55e",
  Queued: "#488bf4",
  Executed: "#488bf4",
  Defeated: "#ef4444",
  Cancelled: "#888",
  Expired: "#888",
  Vetoed: "#ef4444",
};

// Font configuration (system fonts for edge runtime compatibility)
export const OG_FONTS = {
  family: "system-ui, -apple-system, sans-serif",
} as const;

// Helper: Format ETH values
export function formatEthDisplay(eth: number | string): string {
  const num = typeof eth === "string" ? parseFloat(eth) : eth;
  if (isNaN(num)) return "0";
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  if (num >= 1) return num.toFixed(2);
  return num.toFixed(4);
}

// Helper: Format USD values
export function formatUsdDisplay(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(2)}`;
}

// Helper: Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

// Helper: Format vote counts
export function formatVotes(votes: number | string): string {
  const num = typeof votes === "string" ? parseInt(votes, 10) : votes;
  if (isNaN(num)) return "0";
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// Helper: Shorten address
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Helper: Get status color
export function getStatusColor(status: string): string {
  return PROPOSAL_STATUS_COLORS[status] || OG_COLORS.muted;
}
