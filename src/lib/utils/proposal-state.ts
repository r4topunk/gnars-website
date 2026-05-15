import { ProposalStatus } from "@/lib/schemas/proposals";

/**
 * Check if proposal is in a successful state (Succeeded or Queued)
 */
export function isProposalSuccessful(status: ProposalStatus): boolean {
  return [ProposalStatus.SUCCEEDED, ProposalStatus.QUEUED].includes(status);
}

/**
 * Parse a blockchain timestamp (can be Unix seconds or ISO string) to Date
 */
export function parseBlockchainTimestamp(timestamp: string | number): Date {
  if (typeof timestamp === "string") {
    // Try parsing as ISO string first
    const isoDate = new Date(timestamp);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    // If that fails, try parsing as Unix timestamp in string form
    const numericTimestamp = parseInt(timestamp, 10);
    if (!isNaN(numericTimestamp)) {
      return new Date(numericTimestamp * 1000);
    }
  }

  if (typeof timestamp === "number") {
    // If timestamp is in seconds, convert to milliseconds
    return new Date(timestamp * 1000);
  }

  return new Date();
}

/**
 * Format time remaining until target date
 * Returns string like "2d 5h 30m" or "5h 30m 15s"
 */
export function formatTimeRemaining(targetDate: Date): string {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "0s";
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours % 24 > 0 || days > 0) {
    parts.push(`${hours % 24}h`);
  }
  if (minutes % 60 > 0 || hours > 0) {
    parts.push(`${minutes % 60}m`);
  }
  if (parts.length === 0 || (parts.length < 2 && days === 0)) {
    parts.push(`${seconds % 60}s`);
  }

  return parts.join(" ");
}
