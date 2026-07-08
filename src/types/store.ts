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
}

export interface StoreData {
  products: Product[];
  meta: {
    total: number;
    lastUpdated: string;
  };
}
