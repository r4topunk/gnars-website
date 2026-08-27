export interface ShopCardLabels {
  shopNow: string;
  viewDetails: string;
  soldOut: string;
  comingSoon: string;
  featured: string;
}

export function formatPrice(priceUSD?: number) {
  if (priceUSD == null) return null;
  return `$${priceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/**
 * True when the card should link straight to an external storefront.
 * `mailto:` inquiries and multi-image listings route through the detail
 * page instead so the buyer sees the product before contacting the vendor.
 */
export function isDirectBuyLink(item: { type: string; externalUrl?: string; images: string[] }) {
  return (
    item.type === "affiliate" &&
    !!item.externalUrl &&
    !item.externalUrl.startsWith("mailto:") &&
    item.images.length <= 1
  );
}
