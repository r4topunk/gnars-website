import storeData from "@/data/store.json";
import type { Product } from "@/types/store";

/**
 * Canonical data-access layer for the storefront.
 *
 * Backed by a static JSON file for now. Every reader below is async so the
 * backing store can later become a database or a fulfillment-provider API
 * without touching call sites.
 *
 * TODO(inventory): availability is currently a static field in store.json.
 *   Replace these reads with a live inventory lookup (e.g. KeepKey SKU status)
 *   so `availability` reflects real stock — see docs/integrations/keepkey-fulfillment.md.
 */
const products = (storeData.products ?? []) as Product[];

export async function getAllProducts(): Promise<Product[]> {
  return products;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return products.filter((product) => product.featured);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  return products.filter((product) => product.category === category);
}
