import type { Availability, Product } from "@/types/store";

/**
 * Meta Commerce catalog feed helpers.
 *
 * Transforms internal `Product` records into the field shape Meta expects for a
 * Commerce catalog / Instagram Shop product feed. This does NOT call the Meta API
 * yet — it only produces the data. Wire it up later behind an authenticated route
 * or a scheduled feed export.
 *
 * Reference field names follow Meta's product catalog spec:
 * https://developers.facebook.com/docs/commerce-platform/catalog/fields
 *
 * TODO(meta-catalog): expose this as a feed endpoint (e.g. GET /api/store/meta-feed
 *   returning CSV or the Catalog Batch API JSON) and/or push via the Graph API
 *   `/{catalog_id}/batch` endpoint on catalog changes. Requires a Meta Business
 *   account, a Commerce catalog id, and a system-user access token.
 */

/** Meta's `availability` enum. Our internal `Availability` maps onto this. */
export type MetaAvailability = "in stock" | "out of stock" | "preorder" | "available for order";

/** Minimal Meta Commerce catalog product entry (required + common optional fields). */
export interface MetaCatalogEntry {
  /** Unique retailer id. Meta calls this `id` in CSV / `retailer_id` in the API. */
  id: string;
  title: string;
  description: string;
  availability: MetaAvailability;
  /** Meta requires a condition; physical merch is "new". */
  condition: "new" | "refurbished" | "used";
  /** Formatted as "<amount> <ISO currency>", e.g. "59.95 USD". */
  price: string;
  /** Absolute URL to the product detail page. */
  link: string;
  /** Absolute URL to the primary image. */
  image_link: string;
  brand: string;
  /** Free-form category label; maps to Meta's `product_type`. */
  product_type: string;
}

const AVAILABILITY_MAP: Record<Availability, MetaAvailability> = {
  in_stock: "in stock",
  out_of_stock: "out of stock",
  preorder: "preorder",
  // Meta has no "coming soon"; the closest orderable-later state is available for order.
  coming_soon: "available for order",
};

/**
 * Build an absolute URL from a site-relative path (images / product links must be
 * absolute in a Meta feed). Falls back to NEXT_PUBLIC_SITE_URL, then gnars.com.
 */
function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://gnars.com").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Transform a single product into a Meta Commerce catalog entry. */
export function toMetaCatalogEntry(product: Product): MetaCatalogEntry {
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    availability: AVAILABILITY_MAP[product.availability],
    condition: "new",
    price: `${product.price.toFixed(2)} ${product.currency}`,
    link: absoluteUrl(`/store/${product.slug}`),
    image_link: absoluteUrl(product.images[0] ?? ""),
    brand: product.brand,
    product_type: product.category,
  };
}

/**
 * Transform a catalog into a Meta Commerce feed, keeping only products explicitly
 * flagged `metaCatalogEligible`.
 */
export function toMetaCatalogFeed(products: Product[]): MetaCatalogEntry[] {
  return products.filter((p) => p.metaCatalogEligible).map(toMetaCatalogEntry);
}
