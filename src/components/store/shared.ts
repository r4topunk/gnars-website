import type { Currency } from "@/types/store";

/** Labels passed from server components (translated) down into the card UI. */
export interface StoreCardLabels {
  buy: string;
  viewDetails: string;
  outOfStock: string;
  preorder: string;
  comingSoon: string;
  featured: string;
}

const CURRENCY_LOCALE: Record<Currency, string> = {
  USD: "en-US",
  EUR: "en-IE",
  BRL: "pt-BR",
};

/** Format a price in its own currency, e.g. 59.95 USD → "$59.95". */
export function formatPrice(price: number, currency: Currency): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price);
}
