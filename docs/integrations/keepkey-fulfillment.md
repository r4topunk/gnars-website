# KeepKey Fulfillment (Dropship) Integration

Status: **implemented, sandbox-verified.** The server-side fulfillment layer (client +
API routes + webhook) is built and tested end-to-end against the KeepKey sandbox. It
runs in **test mode by default** (`KEEPKEY_DROPSHIP_MODE` in `src/lib/config.ts`) — no real
orders, credit, or shipments until that flips to `live`. The customer-facing **checkout is now built**
(USDC on Base, `/store/[slug]/checkout`, real payment gated to live mode) — see
`docs/features/store-checkout.md`.

Docs (partner, auth-gated): https://affiliates.keepkey.com/dropship/docs

## Target flow

Instagram Shop / Meta catalog → Gnars product page (`/store/[slug]`) → **Gnars checkout**
(`/store/[slug]/checkout`, USDC on Base) → `POST /api/store/checkout` (verifies payment) →
`createDropshipOrder` → KeepKey Dropship API → KeepKey ships, then POSTs status webhooks
back. The customer relationship stays entirely under Gnars; KeepKey is the dropship
fulfiller.

## Money flow (important)

Retail is collected by Gnars from the customer. **Settlement to KeepKey is on-chain
crypto**: each live order response includes a `settlement` block — the wholesale amount
owed (e.g. **$49** for the wallet) as a crypto deposit (e.g. BTC to a `bc1q…` address),
drawn against a **$500 credit line**. Sandbox orders return `settlement: null`. So retail
(≈$59.95) − wholesale ($49) = Gnars margin; Gnars owes KeepKey the wholesale in crypto.

## Codebase map

- Client — `src/services/keepkey-dropship.ts` (server-only; `listDropshipProducts`,
  `getDropshipProduct`, `createDropshipOrder`, `getDropshipOrder`,
  `getDropshipOrderByExternalId`, `verifyWebhookSignature`, `isSandbox`,
  `isDropshipConfigured`, `DROPSHIP_SANDBOX_SKU`).
- Types + zod — `src/lib/schemas/dropship.ts`.
- Routes:
  - `POST /api/store/orders` — forward a paid order (live creation gated, see below).
  - `GET  /api/store/orders?externalOrderId=…` — poll status/tracking + settlement by our id.
  - `GET  /api/store/orders/[id]` — fulfillment status by `keepKeyOrderId`.
  - `POST /api/store/keepkey-webhook` — signed status webhook.
- Tests — `src/services/keepkey-dropship.test.ts` (signature verification + externalOrderId lookup).
- Product model — `src/types/store.ts`; catalog `src/data/store.json` via `src/services/store.ts`.
- Checkout — `/store/[slug]/checkout` + `POST /api/store/checkout` (payment gate). See
  `docs/features/store-checkout.md`.
- Still TODO: `TODO(inventory)` (order persistence / customer notification in the webhook).

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
    "country": "US",
    "phone": "+1 555 010 1234"
  },
  "lineItems": [{ "sku": "KK-HW-001", "quantity": 1 }],
  "shippingMethod": "standard",
  "notes": "optional"
}
```

**`shippingMethod` is required** (KeepKey 400s without it) — our schema defaults it to
`"standard"`. The address is validated per-country server-side (empty `state` on a US
address → `invalid_address`). **`shippingAddress.phone` is required for fulfillment** —
KeepKey's Shopify backend rejects Managed Markets orders without a shipping phone (+ email),
so the checkout collects phone as required. Response:

```json
{
  "keepKeyOrderId": "kk_…",
  "status": "received",
  "estimatedShippingDate": null,
  "sandbox": true,
  "settlement": null
}
```

### Order status — `GET /orders/{keepKeyOrderId}` and `GET /orders?externalOrderId=…`

```json
{
  "keepKeyOrderId": "kk_…",
  "externalOrderId": "gnars-1001",
  "status": "received",
  "trackingNumber": null,
  "trackingUrl": null,
  "carrier": null,
  "shippedAt": null,
  "settlement": { "amountDue": 49, "status": "unpaid", "...": "..." }
}
```

`status`: `received | processing | shipped | cancelled | failed`.

**Tracking today is poll-only.** Per the go-live handoff (2026-07-15), KeepKey's
`order.shipped` webhook **does not fire yet** — poll `GET /orders?externalOrderId=…` a few
times a day and read `status` / `trackingNumber` / `trackingUrl` / `carrier`. That endpoint
also re-returns the order's `settlement` block, so a lost create-order response is
recoverable. When tracking-sync ships upstream, `order.shipped` starts arriving on the
existing webhook with no change on our side. `getDropshipOrderByExternalId` /
`GET /api/store/orders?externalOrderId=…` implement this.

### Webhooks — `POST` to our `/api/store/keepkey-webhook`

Events: `order.received | order.processing | order.shipped | order.cancelled | order.failed`
(only `order.received` fires today). Signed **Stripe-style**: `X-KeepKey-Signature:
t=<unix>,v1=<hex>`, where `v1 = HMAC-SHA256(secret, "${t}.${rawBody}")` computed over the
**raw** request body. `verifyWebhookSignature` recomputes that and **rejects timestamps
outside a 5-minute window** (replay defense; `WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS`). Payload:
`eventType, keepKeyOrderId, externalOrderId, status, trackingNumber?, trackingUrl?, carrier?,
timestamp`. With no secret set, webhooks are accepted **only in sandbox** (logged as
unverified) and rejected in live.

### Errors

`{ "error": { "code": "...", "message": "..." } }` with codes like `invalid_request`,
`invalid_address`, `out_of_stock`, `insufficient_credit`, `account_suspended` (an overdue
settlement blocks new orders until it clears), plus `401` (bad/missing token).
`DropshipApiError` carries the HTTP status + code; routes surface them unchanged.

## Settlement (live orders)

Each live order response carries a `settlement` block — the wholesale owed to KeepKey as a
crypto deposit (`amountDue` in USD, `chainAmount` in BTC to a unique per-order
`depositAddress`, `dueAt` ≈ 30 days), drawn against the $500 credit line. Send **exactly
`chainAmount`** to that order's `depositAddress` before `dueAt`; detection is automatic
(~15 min, 1 confirmation) and restores credit. **Store or recover the settlement** — the
create-order response has it, and `GET /orders?externalOrderId=…` re-returns it. An overdue
settlement suspends the account (`account_suspended`). At $49/unit the $500 line is ≈10
unsettled orders in flight; settle roughly weekly. Sandbox orders return `settlement: null`.

## Sandbox

Use the `kk_ds_test_…` token against the same base URL. Every write is flagged
`sandbox: true`, draws no credit, and never ships. Reserved always-orderable SKU:
**`KK-TEST-001`**.

## Environment (server-only — never `NEXT_PUBLIC_`)

| Var                                | Purpose                                            |
| ---------------------------------- | -------------------------------------------------- |
| `KEEPKEY_DROPSHIP_TEST_TOKEN`      | sandbox bearer token                               |
| `KEEPKEY_DROPSHIP_LIVE_TOKEN`      | live bearer token                                  |
| `KEEPKEY_DROPSHIP_BASE_URL`        | optional override (defaults to the base URL above) |
| `KEEPKEY_DROPSHIP_WEBHOOK_SECRET`  | HMAC secret for verifying webhooks                 |
| `KEEPKEY_DROPSHIP_INTERNAL_SECRET` | gates the raw `POST /api/store/orders` live path   |

Set real values in Vercel env / `.env.local`; they are gitignored and never committed.

**Mode is not an env var.** `test` vs `live` is set in code at `src/lib/config.ts`
(`KEEPKEY_DROPSHIP_MODE`, read via `isSandbox()`). To go live, change it there and ship —
no Vercel change flips it.

## Going live (checklist)

1. ✅ Checkout + payment built (`/store/[slug]/checkout` → `POST /api/store/checkout`, USDC
   on Base). Set `NEXT_PUBLIC_STORE_CHECKOUT_ADDRESS` (the store wallet) before going live.
2. Set `KEEPKEY_DROPSHIP_LIVE_TOKEN`, `KEEPKEY_DROPSHIP_WEBHOOK_SECRET`,
   `KEEPKEY_DROPSHIP_INTERNAL_SECRET` in Vercel, then set `KEEPKEY_DROPSHIP_MODE = "live"` in
   `src/lib/config.ts` and ship. Orders then use the real SKU `KK-HW-001` (not `KK-TEST-001`);
   the color finish rides along in `notes`.
3. Do one **recommended first live order** (1× `KK-HW-001` to a real address via the
   internal-secret gate), confirm `sandbox:false` + a non-null `settlement`, verify the
   signed `order.received` webhook arrives, then pay the settlement early to prove the BTC
   flow and restore credit.
4. Poll `GET /orders?externalOrderId=…` until `shipped` (the `order.shipped` webhook is not
   live yet); then wire storefront traffic.
5. Persist orders + surface tracking to the customer (`TODO(inventory)`).
6. Fund/monitor the crypto settlement against the $500 credit line.
