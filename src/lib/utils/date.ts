import { formatDistanceToNow } from "date-fns";

export function formatSafeDistanceToNow(dateString: string | undefined | null, fallback = 'Unknown date'): string {
  if (!dateString) return fallback;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return fallback;
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return fallback;
  }
}