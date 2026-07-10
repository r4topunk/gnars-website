# KeepKey Fulfillment (Dropship) Integration

Status: **implemented, sandbox-verified.** The server-side fulfillment layer (client +
API routes + webhook) is built and tested end-to-end against the KeepKey sandbox. It
runs in **test mode by default** (`KEEPKEY_DROPSHIP_MODE=test`) — no real orders, credit,
or shipments until that flips to `live`. The customer-facing **checkout/payment step is
still not built**, so nothing calls the live order path in production yet.

Docs (partner, auth-gated): https://affiliates.keepkey.com/dropship/docs

## Target flow

Instagram Shop / Meta catalog → Gnars product page (`/store/[slug]`) → **Gnars checkout
(payment — TODO)** → `POST /api/store/orders` → KeepKey Dropship API → KeepKey ships,
then POSTs status webhooks back. The customer relationship stays entirely under Gnars;
KeepKey is the dropship fulfiller.

## Money flow (important)

Retail is collected by Gnars from the customer. **Settlement to KeepKey is on-chain
crypto**: each live order response includes a `settlement` block — the wholesale amount
owed (e.g. **$49** for the wallet) as a crypto deposit (e.g. BTC to a `bc1q…` address),
drawn against a **$500 credit line**. Sandbox orders return `settlement: null`. So retail
(≈$59.95) − wholesale ($49) = Gnars margin; Gnars owes KeepKey the wholesale in crypto.

## Codebase map

- Client — `src/services/keepkey-dropship.ts` (server-only; `listDropshipProducts`,
  `getDropshipProduct`, `createDropshipOrder`, `getDropshipOrder`, `verifyWebhookSignature`,
  `isSandbox`, `isDropshipConfigured`, `DROPSHIP_SANDBOX_SKU`).
- Types + zod — `src/lib/schemas/dropship.ts`.
- Routes:
  - `POST /api/store/orders` — forward a paid order (live creation gated, see below).
  - `GET  /api/store/orders/[id]` — fulfillment status by `keepKeyOrderId`.
  - `POST /api/store/keepkey-webhook` — signed status webhook.
- Product model — `src/types/store.ts`; catalog `src/data/store.json` via `src/services/store.ts`.
- Still TODO: `TODO(checkout)` (`ProductDetail.tsx`), `TODO(inventory)` (order persistence /
  customer notification in the webhook), `TODO(keepkey-webhook)` (confirm exact signing string).

## API (as built)

Base URL: `https://affiliates.keepkey.com/api/dropship/v1`
Auth: `Authorization: Bearer <token>` — `kk_ds_live_…` or `kk_ds_test_…`.

### Products

`GET /products` → `{ products: [...] }`; `GET /products/{sku}` → one product:

```json
{
  "sku": "KK-HW-001",
  "name": "KeepKey Hardware Wallet",
  "description": "…",
  "price": 49,
  "currency": "USD",
  "availability": "in_stock",
  "images": [],
  "shippingRegions": null
}
```

`availability`: `in_stock | out_of_stock | discontinued`. `shippingRegions`: `null` (ships
anywhere KeepKey normally ships) or an array of ISO country codes.

> Only `KK-HW-001` (the wallet) is in KeepKey's dropship catalog. Our store's color
> "variants" are cosmetic — they all fulfill as `KK-HW-001` (pass the finish in `notes`).
> The tees are not KeepKey-fulfilled (print-on-demand elsewhere).

### Create an order — `POST /orders`

```json
{
  "externalOrderId": "gnars-1001",
  "customerName": "Jane Buyer",
  "customerEmail": "jane@example.com",
  "shippingAddress": {
    "line1": "123 Main St",
    "line2": "",
    "city": "Denver",
    "state": "CO",
    "postalCode": "80202",
    "country": "US"
  },
  "lineItems": [{ "sku": "KK-HW-001", "quantity": 1 }],
  "shippingMethod": "standard",
  "notes": "optional"
}
```

**`shippingMethod` is required** (KeepKey 400s without it) — our schema defaults it to
`"standard"`. The address is validated per-country server-side (empty `state` on a US
address → `invalid_address`). Response:

```json
{
  "keepKeyOrderId": "kk_…",
  "status": "received",
  "estimatedShippingDate": null,
  "sandbox": true,
  "settlement": null
}
```

### Order status — `GET /orders/{keepKeyOrderId}`

```json
{
  "keepKeyOrderId": "kk_…",
  "externalOrderId": "gnars-1001",
  "status": "received",
  "trackingNumber": null,
  "trackingUrl": null,
  "carrier": null,
  "shippedAt": null
}
```

`status`: `received | processing | shipped | cancelled | failed`.

### Webhooks — `POST` to our `/api/store/keepkey-webhook`

Events: `order.received | order.processing | order.shipped | order.cancelled | order.failed`.
Signed with **HMAC-SHA256** via the `X-KeepKey-Signature` header (timestamped) using
`KEEPKEY_DROPSHIP_WEBHOOK_SECRET`. Payload: `eventType, keepKeyOrderId, externalOrderId,
status, trackingNumber?, trackingUrl?, carrier?, timestamp`.

> `TODO(keepkey-webhook)`: the exact signed-payload string (`${t}.${rawBody}` vs `rawBody`)
> is not yet confirmed from the docs; `verifyWebhookSignature` tries both. Confirm against a
> real event, then drop the fallback. With no secret set, webhooks are accepted **only in
> sandbox** (logged as unverified) and rejected in live.

### Errors

`{ "error": { "code": "...", "message": "..." } }` with codes like `invalid_request`,
`invalid_address`, `out_of_stock`, `insufficient_credit`, plus `401` (bad/missing token).
`DropshipApiError` carries the HTTP status + code; routes surface them unchanged.

## Sandbox

Use the `kk_ds_test_…` token against the same base URL. Every write is flagged
`sandbox: true`, draws no credit, and never ships. Reserved always-orderable SKU:
**`KK-TEST-001`**.

## Environment (server-only — never `NEXT_PUBLIC_`)

| Var                                | Purpose                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| `KEEPKEY_DROPSHIP_MODE`            | `test` (default) or `live` — selects which token is used |
| `KEEPKEY_DROPSHIP_TEST_TOKEN`      | sandbox bearer token                                     |
| `KEEPKEY_DROPSHIP_LIVE_TOKEN`      | live bearer token                                        |
| `KEEPKEY_DROPSHIP_BASE_URL`        | optional override (defaults to the base URL above)       |
| `KEEPKEY_DROPSHIP_WEBHOOK_SECRET`  | HMAC secret for verifying webhooks                       |
| `KEEPKEY_DROPSHIP_INTERNAL_SECRET` | gates live order creation until checkout exists          |

Set real values in Vercel env / `.env.local`; they are gitignored and never committed.

## Going live (checklist)

1. Build Gnars checkout + payment; only call `POST /api/store/orders` **after** payment settles.
2. Set `KEEPKEY_DROPSHIP_LIVE_TOKEN`, `KEEPKEY_DROPSHIP_WEBHOOK_SECRET`,
   `KEEPKEY_DROPSHIP_INTERNAL_SECRET` in Vercel; flip `KEEPKEY_DROPSHIP_MODE=live`.
3. Register the webhook URL with KeepKey; confirm the signing string and remove the fallback.
4. Persist orders + surface tracking to the customer (`TODO(inventory)`).
5. Fund/monitor the crypto settlement against the $500 credit line.
