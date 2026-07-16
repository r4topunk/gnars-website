/**
 * Which store SKUs can actually be ordered through KeepKey's dropship API.
 *
 * Per docs/integrations/keepkey-fulfillment.md, KeepKey's dropship catalog only stocks the
 * base hardware wallet (`KK-HW-001`); the color finishes are cosmetic and fulfill as that
 * same SKU. The tees carry `KK-TEE-*` SKUs but are print-on-demand elsewhere — they are NOT
 * dropship-fulfillable, so checkout must stay disabled for them until a fulfiller exists.
 *
 * Kept dependency-free (no `server-only`, no fetch) so both the client CTA and the server
 * checkout route can share one source of truth. Extend the list when KeepKey adds SKUs.
 */
export const DROPSHIP_CATALOG_SKUS = ["KK-HW-001"] as const;

export function isDropshipFulfillable(sku?: string | null): boolean {
  return Boolean(sku && (DROPSHIP_CATALOG_SKUS as readonly string[]).includes(sku));
}
