# KeepKey Fulfillment (Dropship) Integration

Status: **spec / not yet integrated.** The `/store` route ships today as a read-only
catalog with checkout disabled. This document captures the target flow and the API
Gnars needs KeepKey to provide so payment + fulfillment can be wired up later.

## Target flow

Instagram Shop / Meta catalog → Gnars product page (`/store/[slug]`) → **Gnars checkout**
→ KeepKey fulfillment API → KeepKey ships the product.

The customer-facing experience stays entirely under Gnars. KeepKey is a dropship /
fulfillment provider: Gnars takes payment, then hands the paid order to KeepKey.

## Where this maps in the codebase

- Product model — `src/types/store.ts` (`Product.fulfillmentProvider = "keepkey"`, `Product.fulfillmentSku`)
- Catalog — `src/data/store.json`, read via `src/services/store.ts`
- Meta catalog feed — `src/lib/store/meta-catalog.ts` (`toMetaCatalogFeed`)
- Checkout / order hand-off — **not built yet.** Search the code for these TODO tags:
  - `TODO(checkout)` — `src/components/store/ProductDetail.tsx`
  - `TODO(inventory)` — `src/services/store.ts`
  - `TODO(meta-catalog)` — `src/lib/store/meta-catalog.ts`

## API we need from KeepKey

### 1. Product / SKU information

Look up a KeepKey product by SKU. Required fields:

- `sku`
- product name
- description
- price
- currency
- availability / inventory status
- product images
- shipping regions (if restricted)

### 2. Order creation — `POST /orders`

Gnars sends paid orders to KeepKey after checkout.

Request:

```json
{
  "externalOrderId": "gnars-0001",
  "customerName": "Jane Shredder",
  "customerEmail": "jane@example.com",
  "shippingAddress": {
    "line1": "123 Skate St",
    "line2": "",
    "city": "Denver",
    "state": "CO",
    "postalCode": "80202",
    "country": "US"
  },
  "lineItems": [{ "sku": "KK-HW-001", "quantity": 1 }],
  "shippingMethod": "standard",
  "notes": "Leave at front desk"
}
```

Response:

```json
{
  "keepKeyOrderId": "kk_abc123",
  "status": "received",
  "estimatedShippingDate": "2026-07-15"
}
```

### 3. Order status — `GET /orders/{keepKeyOrderId}`

```json
{
  "keepKeyOrderId": "kk_abc123",
  "externalOrderId": "gnars-0001",
  "status": "shipped",
  "trackingNumber": "1Z999...",
  "trackingUrl": "https://...",
  "carrier": "UPS",
  "shippedAt": "2026-07-12T18:00:00Z"
}
```

`status`: `received | processing | shipped | cancelled | failed`

### 4. Webhooks (preferred)

KeepKey notifies Gnars on status change. Events:
`order.received`, `order.processing`, `order.shipped`, `order.cancelled`, `order.failed`.

Payload:

```json
{
  "eventType": "order.shipped",
  "keepKeyOrderId": "kk_abc123",
  "externalOrderId": "gnars-0001",
  "status": "shipped",
  "trackingNumber": "1Z999...",
  "trackingUrl": "https://...",
  "carrier": "UPS",
  "timestamp": "2026-07-12T18:00:00Z"
}
```

Include a webhook signing method (e.g. HMAC signature header) so Gnars can verify authenticity.

### 5. Authentication

Simple, secure. Preferred: API key in header or bearer token.

```
Authorization: Bearer <token>
```

### 6. Sandbox / test mode

A sandbox base URL or a test API key so Gnars can create fake orders before going live.

### 7. Error handling

Clear, typed errors for: invalid SKU, out of stock, invalid address, unsupported
shipping region, duplicate `externalOrderId`, auth failure.

## Developer deliverables requested from KeepKey

- API base URL + sandbox base URL
- Auth method
- Endpoint documentation
- Example request/response JSON
- A test SKU
- Webhook signing method (if webhooks are supported)

## First integration target

Gnars sells one KeepKey product on `gnars.com/store`, accepts payment on Gnars, then
sends the order to KeepKey for fulfillment. Everything else (multi-item carts, live
inventory sync, returns) comes after this path works end to end.
