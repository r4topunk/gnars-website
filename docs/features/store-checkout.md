# Store Checkout & Payment

Status: **Phase 1 built (USDC on Base), sandbox-verified.** The customer-facing checkout
exists at `/store/[slug]/checkout`: shipping form → payment → order → confirmation with
polled status. Real payment is **gated to live mode** — in sandbox (`KEEPKEY_DROPSHIP_MODE=test`)
the flow skips payment and places a free `KK-TEST-001` order so the whole UX is testable.
Phase 2 (receipts, buyer order lookup) and Phase 3 (settlement automation, cards) are still
open. This doc records the chosen approach and what's left.

## The flow we're completing

```
customer pays Gnars  →  Gnars verifies payment  →  POST /api/store/orders (KeepKey)
                                                  →  KeepKey ships
Gnars settles KeepKey in crypto (BTC deposit, drawn on the $500 credit line)
```

Everything right of "verifies payment" already exists (`src/services/keepkey-dropship.ts`

- `/api/store/orders`). We need the left side.

## Constraints that decide the approach

- **KeepKey settles in crypto** (BTC deposit address per order). Wholesale ≈ $49, retail
  $59.95 → margin ≈ $11.
- **Gnars is a DAO** — no easy legal entity for a card merchant account, and card
  processors (Stripe/Shopify) require one + KYC.
- **PCI**: never touch raw card data (see the payments/liability note in
  `docs/integrations/keepkey-fulfillment.md`).
- **Stack already in place**: thirdweb (login + sponsored writes on Base) + wagmi/viem
  reads, treasury address in `src/lib/config.ts`, `USDC_BASE`, and Postgres (`pg`, used by
  `/rounds`) available for order persistence.

## Options

### A. Crypto on Base (USDC) — **recommended for v1**

Customer pays **USDC on Base** to a Gnars-controlled address; the server verifies the
on-chain transfer, then forwards the order to KeepKey.

- **Pros**: no PCI, no merchant entity, matches the stack + audience, aligns with KeepKey's
  crypto settlement, near-instant, self-custodial. thirdweb already handles wallet + AA.
- **Cons**: crypto-only buyers (fine for this audience); refunds are manual crypto sends;
  need on-chain tx verification + light order storage.
- Use **USDC** (not ETH) so the charged amount is price-stable.

### B. Card via merchant-of-record (Shopify / Paddle / Lemon Squeezy)

A third party is the MoR, absorbing PCI + sales tax.

- **Pros**: cards, familiar UX, PCI/tax offloaded.
- **Cons**: needs a legal entity + fees; duplicates the catalog; still must convert
  fiat → crypto to settle KeepKey; most moving parts.

### C. Hybrid

Ship A now; add B later when an entity exists and card demand is proven.

## Recommendation

**A (USDC on Base) for v1, hybrid later.** It clears the two hard blockers (no PCI, no
entity), fits the existing web3 stack and the crypto settlement KeepKey requires, and gets
a working checkout on gnars.com fastest.

## Build plan

**Phase 1 — MVP checkout (USDC → order) — BUILT**

1. ✅ Checkout page `/store/[slug]/checkout`: finish + email + shipping address.
2. ✅ Pay: thirdweb `sendTransaction` — USDC transfer of the retail amount to the store
   checkout wallet, via `useUsdcPayment()`. Captures `txHash`. Signs through
   `useWriteAccount()` so it honors the EOA/SA view mode.
3. ✅ Server verifies the tx with viem (`verifyUsdcPayment`: recipient, token = Base USDC,
   amount ≥ price, ≥1 confirmation, tx succeeded), then calls `createDropshipOrder`.
4. ✅ Confirmation shows `keepKeyOrderId` + status polled via
   `GET /api/store/orders?externalOrderId=…` (tracking appears once KeepKey ships).
5. ⬜ Order persistence (Postgres) — deferred; KeepKey is currently the source of truth and
   the order is recoverable by `externalOrderId`.

**Phase 2 — status + receipts**

- Email receipt/tracking to the buyer; buyer-facing order lookup (by email or wallet).

**Phase 3 — settle + cards**

- Automate/operate USDC → BTC settlement to KeepKey against the credit line.
- Add card checkout via a MoR when a legal entity exists.

## How it works (as built)

```
/store/[slug] ──Buy now──▶ /store/[slug]/checkout ──▶ POST /api/store/checkout
                                                        │
                          sandbox: no payment ──────────┤
                          live: verify USDC tx ─────────┘──▶ createDropshipOrder → KeepKey
```

- **Mode gate** — `isSandbox()` decides everything. Sandbox: no payment, SKU forced to
  `KK-TEST-001`, `externalOrderId` random. Live: `txHash` required and re-verified server-side,
  real SKU, `externalOrderId = gnars-<txHash>`.
- **Double-spend safety** — the live `externalOrderId` is derived from the payment tx hash, and
  KeepKey dedupes on `externalOrderId`, so one payment can never place two orders.
- **Eligibility** — only SKUs in `DROPSHIP_CATALOG_SKUS` (`src/lib/store/fulfillment.ts`) get a
  checkout. The tees carry `keepkey` + `KK-TEE-*` SKUs but are print-on-demand elsewhere, so
  they stay "coming soon" (enforced on the CTA, the page, and the API).
- **Trust boundary** — the client only supplies a tx hash; amount/recipient/token are re-read
  from chain. Never trust a client-reported payment.

### Code map

- `src/app/[locale]/store/[slug]/checkout/page.tsx` — checkout route.
- `src/components/store/CheckoutFlow.tsx` — form, payment, confirmation + status polling.
- `src/hooks/use-usdc-payment.ts` — USDC transfer on Base via thirdweb.
- `src/app/api/store/checkout/route.ts` — payment gate → fulfillment order.
- `src/services/store-payment.ts` — on-chain payment verification (+ `.test.ts`).
- `src/lib/schemas/checkout.ts`, `src/lib/store/fulfillment.ts` (+ `.test.ts`).

### Environment

`NEXT_PUBLIC_STORE_CHECKOUT_ADDRESS` — dedicated store wallet that receives USDC. Defaults to
the Gnars store wallet hardcoded in `src/lib/config.ts` (`STORE_CHECKOUT.recipient`); set the
env var only to override per-deploy. Only used in live mode (sandbox skips payment).

## Open decisions for Vlad

1. ~~Payment token/recipient~~ — decided: **USDC on Base → dedicated checkout wallet**
   (`NEXT_PUBLIC_STORE_CHECKOUT_ADDRESS`).
2. **Who operates settlement** — manual BTC deposit to KeepKey per order, or batched/automated?
3. **Refund policy** — crypto refunds are manual; define window + who signs.
4. **Order storage** — reuse the existing Postgres (`pg`) or a KV store (Phase 1 defers it).
5. **Merchant-of-record / legal** — needed before any card path (option B).

## What's testable now

In sandbox, the full customer flow works free: `/store/keepkey-hardware-wallet` → **Buy now**
→ fill the form → **Place test order** → confirmation with a live-polled status. Nothing is
charged and nothing ships. The older `SandboxOrderTester` panel on the device page still
places a raw `KK-TEST-001` order without the form.
