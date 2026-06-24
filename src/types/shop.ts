export type ShopItemType = "affiliate" | "native";

export type ShopItemStatus = "active" | "coming-soon" | "sold-out";

export interface ShopItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  /** First image is used as the cover. */
  images: string[];
  /** Display price in USD. Optional while a listing is still being set up. */
  priceUSD?: number;
  type: ShopItemType;
  /** Required for affiliate items — the external store URL (ref params allowed). */
  externalUrl?: string;
  /** Optional vendor/brand label shown on the card. */
  vendor?: string;
  tags?: string[];
  status: ShopItemStatus;
  /** Surfaced in the featured highlights section at the top of /shop. */
  featured?: boolean;
}

export interface ShopData {
  items: ShopItem[];
  meta: {
    total: number;
    lastUpdated: string;
  };
}
