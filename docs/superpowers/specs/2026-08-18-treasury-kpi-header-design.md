# Treasury KPI header redesign

Apply the evolved top section from the Claude Design mock
(`Treasury.dc.html`, project `8b9a918a-e570-4c4f-ac96-32db36a3ebf6`) to
`/treasury`. Scope is the header row and the KPI cards only — everything below
(Allocation, Inflows, Sponsorship, charts, Token Holdings, NFT grid) stays as
shipped in #273/#274. User approved this scope and the design below.

## Header

Title + description unchanged on the left. On the right, a "Synced Xm ago"
pill: green dot, muted border/background, bound to the timestamp the treasury
snapshot was generated (the page ISR-revalidates every 300s, so the badge honestly
reads minutes, not hours). Server-rendered relative time; no client ticking.
i18n: EN "Synced {time} ago" / PT "Sincronizado há {time}" via next-intl's
relative formatting, both locales in the same change.

## KPI row: one component, four cards

Replace the three inline `<Card>` blocks in `page.tsx` with a single server
component `TreasuryKpiRow` under one `Suspense`. It loads
`loadTreasurySnapshot` once (today's three cards already share that load via
React `cache`) plus the new `loadSubnetEarnings`, and renders four cards:

| Card | Value | Note | Accent | Corner mark |
| --- | --- | --- | --- | --- |
| Total Treasury Value | usdTotal (fiat — BRL on PT, existing rule + fallback note) | "across {n} assets" (priced snapshot assets incl. ETH) | red | `public/red_noggles.png`, opacity .2 |
| ETH Balance | ethBalance ETH | ETH in USD (fiat — converts on PT) | blue | ETH diamond SVG from mock |
| Total Auction Sales | totalAuctionSales ETH | "{n} auctions settled" (real settled count from subgraph, not the mock's 12) | yellow | ETH diamond SVG |
| Subnet Earnings | total USDC (token quantity — never converts to BRL, same rule as "6.8003 ETH") | "Morpheus · {n} claims" | green | USDC circle SVG from mock, value text green |

Card chrome, per the mock: border `color-mix(in oklab, <accent> 26%, <default border>)`,
radial tint `color-mix(in oklab, <accent> 16%, transparent)` from the bottom-right
corner, mono tabular values (CountUp animation kept), 12px muted unit and note.
Accents come from theme tokens/`color-mix`, not hardcoded dark-only colors, so
light mode degrades gracefully. Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.

## New data: subnet earnings

The inflows feed is windowed (Alchemy pages of 50), so it cannot honestly sum
all-time earnings. New service function `loadSubnetEarnings()` in
`src/services/treasury-inflows.ts`: Alchemy `getAssetTransfers` filtered
`fromAddress = SUBNET_FINAL_SPLIT`, `toAddress = treasury`, category erc20
(USDC), paginated to exhaustion (the claim history is small). Returns
`{ totalUsdc, claimCount } | null`; `null` (fetch failure or no ALCHEMY_KEY)
renders the card with an em dash value and no claim note — never $0. React
`cache` for per-request dedup; page ISR (300s) is the refresh cadence.

Auctions settled count: total count of settled auctions from the existing
subgraph query path (aggregate count, not the mock's placeholder 12).

## Error handling

- Snapshot load failure: em-dash values in the affected cards (the page's
  "unavailable, not zero" convention), notes omitted.
- Subnet earnings `null`: dash, no fabricated zero.
- BRL rate outage: existing `FiatFallbackNote` appears in the Total card (the
  only KPI card showing converted fiat as its main value).

## Testing

- Unit: none new beyond existing fiat tests (presentation component + a fetch
  aggregator; the aggregation math is a two-line reduce).
- Runtime: dev captures EN + PT, desktop + mobile, light + dark chrome checked
  in desktop capture; gates (tsc/eslint/prettier) clean; i18n parity for the
  new strings in both locales.
