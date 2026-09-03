# SwapPro Swap Integration

The `/swap` page trades ETH, USDC, GNARS and the other Base tokens in the picker through
the [SwapPro HTTP API](https://www.swaps.pro/docs/api). One `GET /quote` routes across
0x, CoW, LI.FI, Relay and more and returns a firm quote with the transaction to sign.
There is no API key. All transaction signing happens through the existing thirdweb
wallet layer (`useWriteAccount`), exactly as before.

## Architecture

```
src/app/[locale]/swap/
  SwapWidget.tsx      "use client" — token pickers, debounced price, approve, swap (unchanged UI)

src/lib/
  swappro.ts          pure: SwapPro request/response ⇄ the shape the widget reads (unit-tested)
  swapproRoute.ts     the one handler: reads the query, sets the fee from config, calls SwapPro

src/app/api/0x/
  price/route.ts      GET → swapproRoute   (kept at its old path so the widget does not change)
  quote/route.ts      GET → swapproRoute   (same call: every SwapPro answer is firm)
```

The routes keep their `/api/0x/*` paths on purpose: the widget's two-step flow (price while
typing, quote on click) is untouched, and the fee recipient is still set server-side from
`src/lib/config.ts` rather than in the client bundle.

## Flow

1. User picks sell/buy tokens and enters an amount.
2. After 600 ms of idle, `SwapWidget` calls `/api/0x/price` with `chainId`, `sellToken`,
   `buyToken`, `sellAmount` (base units), `taker`, `sellDecimals`, `buyDecimals` and
   (optionally) `fee=1`.
3. The handler converts base units to human decimals, maps the native sentinel
   (`0xeeee…`) to the chain's native symbol, and calls
   `https://www.swaps.pro/api/sdk/v1/quote`. The answer comes back in the widget's shape:
   `liquidityAvailable`, `buyAmount` / `minBuyAmount` in base units, `issues.allowance`
   when an ERC-20 approval is needed, `transaction { to, data, value, gas }`, and `route`
   naming the venue SwapPro chose.
4. If `issues.allowance` is present, the widget shows "Approve". SwapPro's approval is for
   the exact amount; the widget's existing approve flow (`prepareContractCall` +
   `sendTransaction`) is unchanged.
5. "Swap" calls `/api/0x/quote` — the same call — and sends `transaction` via
   `prepareTransaction` on the user's thirdweb account.
6. Wrong-network state shows a "Switch to Base" CTA, as before.

## Configuration

| Setting       | Source                                       | Notes                                                                                                 |
| ------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| API key       | none                                         | SwapPro is CORS-open and keyless. `ZEROX_API_KEY` is no longer read.                                  |
| Fee recipient | `getSwapFeeRecipient` in `src/lib/config.ts` | Sent as SwapPro's `partner`. An EVM address as partner is the opt-in to being paid the partner share. |
| Fee rate      | `SWAP_FEE_BPS` in `src/lib/config.ts`        | Sent as `partnerFeeBps`. SwapPro caps it at 100 bps (200 with a Pro Pass).                            |
| Rate limit    | SwapPro                                      | 60 quotes a minute per IP with no credential; the proxy shares the site's server IP.                  |

## Affiliate fee behaviour — read this before merging

The fee is still **opt-in per request** (`fee=1`, the "Support Gnars treasury" checkbox,
default checked). What changes is _how_ it is collected, and it depends on the venue
SwapPro picks for the quote:

- **CoW** — a genuine on-chain volume fee to the partner address, per swap.
- **0x and LI.FI** — the partner share rides inside SwapPro's own fee and is settled to
  the partner address from SwapPro's request log, not on chain per swap.
- **Relay and other same-chain venues** — cannot carry a partner fee at all.

Every quote returns a `partnerFee` block saying what was requested, what was collected
and whether it was `paidToPartner`, and the handler passes it through verbatim. With the
direct 0x integration the fee landed in the split contract on every swap; with SwapPro
it lands on some venues per swap and is settled off-chain on others. SwapPro also takes
its own 30 bps on same-chain EVM routes. This is a treasury-policy decision for the DAO,
not a code one, and it is the reason this PR is a proposal rather than a drop-in.

## What the user gains

- Every quote is priced across every venue at once, not just 0x.
- `minBuyAmount` is the floor the transaction enforces on chain; the wallet receives at
  least that or the transaction reverts.
- No API key to rotate, no per-request 0x pricing.
- Cross-chain and Bitcoin-native routes (THORChain) are one parameter away when the DAO
  wants them: the same endpoint takes a different `sellChain`.

## Chains

SwapPro routes Base, Ethereum, Arbitrum, BNB Chain, Avalanche and Robinhood Chain. Optimism
is in the site's chain list but not routed by SwapPro yet; the handler answers
`liquidityAvailable: false` with `code: UNSUPPORTED_CHAIN` for it.
