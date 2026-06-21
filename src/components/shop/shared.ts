export interface ShopCardLabels {
  shopNow: string;
  viewDetails: string;
  soldOut: string;
  comingSoon: string;
  featured: string;
  revealSoon: string;
  preview: string;
}

export function formatPrice(priceUSD?: number) {
  if (priceUSD == null) return null;
  return `$${priceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
