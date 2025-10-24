import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format ETH amount with proper decimal places and units
 * Shows up to 5 decimals, removing trailing zeros
 */
export function formatETH(value: string | number | undefined): string {
  if (!value || value === "0" || value === "") {
    return "0 ETH";
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return "0 ETH";
  }

  // Format with up to 5 decimal places, removing trailing zeros
  if (numValue >= 1000) {
    return `${numValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 5
    })} ETH`;
  } else if (numValue >= 0.00001) {
    // Use parseFloat to remove trailing zeros
    return `${parseFloat(numValue.toFixed(5))} ETH`;
  } else {
    return `${numValue.toExponential(2)} ETH`;
  }
}

/**
 * Get ETH amount display with semantic styling
 */
export function getETHDisplayProps(value: string | number | undefined) {
  const numValue = typeof value === "string" ? parseFloat(value || "0") : (value || 0);

  return {
    formatted: formatETH(value),
    isSignificant: numValue >= 0.01,
    isLarge: numValue >= 100,
    textColor: numValue >= 1 ? "text-green-600 dark:text-green-400" :
               numValue >= 0.01 ? "text-amber-600 dark:text-amber-400" :
               "text-muted-foreground"
  };
}
