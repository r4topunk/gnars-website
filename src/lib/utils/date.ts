import { formatDistanceToNow } from "date-fns";

export function formatSafeDistanceToNow(
  dateString: string | undefined | null,
  fallback = "Unknown date",
): string {
  if (!dateString) return fallback;

  try {
    // Check if it's a Unix timestamp (number as string)
    let date: Date;
    if (/^\d+$/.test(dateString)) {
      // It's a Unix timestamp in milliseconds
      date = new Date(parseInt(dateString, 10));
    } else {
      // Try parsing as ISO string or other date format
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      console.warn("Invalid date string:", dateString);
      return fallback;
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.warn("Error formatting date:", dateString, error);
    return fallback;
  }
}
