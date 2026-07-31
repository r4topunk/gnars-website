/**
 * Storefront data model for /store.
 *
 * This is intentionally a plain, database-agnostic shape. Today the catalog is
 * a static JSON file (see src/data/store.json) read through src/services/store.ts.
 * When the catalog moves to a database or a fulfillment provider's API, keep this
 * `Product` interface as the boundary type so the UI and the Meta catalog feed
 * (src/lib/store/meta-catalog.ts) don't need to change.
 */

/** ISO 4217 currency code. Kept as a string union so `formatPrice` can rely on it. */
export type Currency = "USD" | "EUR" | "BRL";

/**
 * Stock status. Values are mapped to Meta Commerce availability strings in
 * src/lib/store/meta-catalog.ts — keep them stable or update that mapping.
 */
export type Availability = "in_stock" | "out_of_stock" | "preorder" | "coming_soon";

/**
 * Who ships the product once an order is placed.
 * - `keepkey`  — KeepKey dropship / fulfillment API (see docs/integrations/keepkey-fulfillment.md)
 * - `gnars`    — fulfilled by the Gnars community directly
 * - `external` — sold and shipped by a third party; `externalProductUrl` should be set
 */
export type FulfillmentProvider = "keepkey" | "gnars" | "external";

/**
 * Which animated 3D device (if any) renders in place of a static image.
 * Products without this fall back to `images`. See src/components/store/KeepKeyDevice3D.tsx.
 */
export type Device3D = "keepkey";

/**
 * A purchasable color/finish variant of a product. Each variant carries its own
 * SKU (and optional price override) so it maps cleanly to a fulfillment provider
 * and, later, to real checkout line items.
 */
export interface ProductVariant {
  /** Stable id, unique within the product. */
  id: string;
  /**
   * Display name of the finish. For `device3d: "keepkey"` products this MUST be one
   * of the KeepKeyDevice3D variant keys (Classic, Red, Green, Gold, Silver) so the
   * animation recolors correctly.
   */
  title: string;
  /** Hex color for the selector swatch and the stage glow. */
  colorHex: string;
  /** SKU handed to the fulfillment provider for this specific finish. */
  fulfillmentSku: string;
  availability: Availability;
  /** Optional per-variant price; falls back to the product `price` when absent. */
  price?: number;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Price in major currency units (e.g. dollars, not cents). */
  price: number;
  currency: Currency;
  /** Ordered image URLs. The first entry is used as the cover. */
  images: string[];
  category: string;
  brand: string;
  availability: Availability;
  fulfillmentProvider: FulfillmentProvider;
  /** SKU used when handing the order off to the fulfillment provider. */
  fulfillmentSku: string;
  /** Optional link to the provider's own product page (fallback while checkout is offline). */
  externalProductUrl?: string;
  /** Whether this product may be exported to a Meta Commerce catalog feed. */
  metaCatalogEligible: boolean;
  /** Surfaced in the featured highlights row at the top of /store. */
  featured?: boolean;
  /** Render an animated 3D device instead of `images` (card, banner, detail stage). */
  device3d?: Device3D;
  /** Selectable color/finish variants. When present, the detail page shows a color selector. */
  variants?: ProductVariant[];
}

export interface StoreData {
  products: Product[];
  meta: {
    total: number;
    lastUpdated: string;
  };
}
