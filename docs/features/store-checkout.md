# Store Checkout & Payment (design)

Status: **design / not built.** Fulfillment (KeepKey dropship) is live in sandbox; the
missing piece is collecting money from the customer and triggering the order. This doc
picks a payment approach and lays out the build.

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

**Phase 1 — MVP checkout (USDC → sandbox order)**

1. Checkout form on `/store/[slug]` (or `/store/checkout`): shipping address + email + finish.
2. Pay: thirdweb `sendTransaction` — USDC transfer of the retail amount to a Gnars checkout
   address (treasury or a dedicated wallet). Capture `txHash`.
3. Server verifies the tx with viem (recipient, token = `USDC_BASE`, amount ≥ price, N
   confirmations, not already used), then calls `createDropshipOrder`.
4. Persist the order (Postgres): `{ txHash, externalOrderId, keepKeyOrderId, status, buyer,
address, createdAt }`. Confirmation page shows `keepKeyOrderId` + polled status.

**Phase 2 — status + receipts**

- Register the KeepKey webhook (push status) + email receipt/tracking to the buyer.
- Buyer-facing order lookup (by email or wallet).

**Phase 3 — settle + cards**

- Automate/operate USDC → BTC settlement to KeepKey against the credit line.
- Add card checkout via a MoR when a legal entity exists.

## Open decisions for Vlad

1. **Payment token/recipient** — USDC (recommended) to treasury, or a dedicated checkout wallet?
2. **Who operates settlement** — manual BTC deposit to KeepKey per order, or batched/automated?
3. **Refund policy** — crypto refunds are manual; define window + who signs.
4. **Order storage** — reuse the existing Postgres (`pg`) or a KV store.
5. **Merchant-of-record / legal** — needed before any card path (option B).

## What's already testable

The fulfillment half is live in sandbox on gnars.com. Use the **sandbox order tester** on a
`/store/[slug]` device page (rendered only while `KEEPKEY_DROPSHIP_MODE=test`) to place a
`KK-TEST-001` order and watch its status — no payment, no shipment. See
`src/components/store/SandboxOrderTester.tsx`.
