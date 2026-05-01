# 0x Swap Integration

The `/swap` page lets users trade ETH, WETH, USDC, GNARS, and a few other Base ERC-20s
through the [0x Swap API v2](https://0x.org/docs/0x-swap-api/introduction). Routing is
handled by 0x's allowance-holder endpoints, and all transaction signing happens through
the existing thirdweb wallet layer (`useWriteAccount`).

## Architecture

```
src/app/swap/
  page.tsx          server component — metadata + page chrome
  SwapWidget.tsx    "use client" — token pickers, debounced price, approve, swap

src/app/api/0x/
  price/route.ts    GET proxy → api.0x.org/swap/allowance-holder/price
  quote/route.ts    GET proxy → api.0x.org/swap/allowance-holder/quote
```

The proxies exist so the `0x-api-key` header stays server-side, and so the affiliate-fee
parameters can be injected without exposing the recipient address in the client bundle.

## Flow

1. User picks sell/buy tokens and enters an amount.
2. After 600 ms of idle, `SwapWidget` calls `/api/0x/price` with `chainId`, `sellToken`,
   `buyToken`, `sellAmount`, `taker`, and (optionally) `fee=1`.
3. If the response includes `issues.allowance`, the widget shows an "Approve" button.
   Approval is signed via `prepareContractCall` + `sendTransaction` against the user's
   active thirdweb account and confirmed via `waitForReceipt`.
4. Once approved (or for ETH), the "Swap" button calls `/api/0x/quote` to get a firm
   transaction (`{ to, data, value, gas }`), wraps it with `prepareTransaction`, and
   sends it via the same thirdweb account.
5. Wrong-network state shows a "Switch to Base" CTA that calls
   `wallet.switchChain(thirdwebBase)`.

## Configuration

| Setting         | Source                                | Notes                                                                                                                                       |
| --------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ZEROX_API_KEY` | env (server-only)                     | 0x API key. Required — proxy returns `500` without it.                                                                                      |
| Fee recipient   | `DAO_ADDRESSES.treasury`              | Hardcoded to the canonical Gnars treasury in `src/lib/config.ts`. Override via `NEXT_PUBLIC_TREASURY_ADDRESS` like every other DAO address. |
| Fee rate        | `SWAP_FEE_BPS` in `src/lib/config.ts` | Defaults to `50` (0.5%). Edit the constant to change.                                                                                       |

Only `ZEROX_API_KEY` is read from the environment. Everything else ships with the
code so the fee destination and rate are auditable in git rather than hidden in
deploy-time secrets.

## Affiliate fee behaviour

The fee is **opt-in per request**: the client appends `&fee=1` to its proxy call,
the proxy sees this flag and injects three params before forwarding to 0x:

```
swapFeeRecipient = DAO_ADDRESSES.treasury
swapFeeBps       = SWAP_FEE_BPS  (default 50)
swapFeeToken     = <buyToken>    (fee is taken on the asset the user receives)
```

Both `/api/0x/price` and `/api/0x/quote` apply identical logic so the indicative
price matches the executed quote. The "Support Gnars treasury (0.5% fee)" checkbox
in `SwapWidget` defaults to **checked** — users can untick it to skip the fee.

## Notes & deviations from the SkateHive reference

- **No multi-chain.** Gnars lives on Base only; the chainId is hardcoded to `8453`
  client-side.
- **No Hive / Zora bonding-curve routes.** Standard 0x ERC-20 swaps only.
- **shadcn / Tailwind, not Chakra.** UI is rebuilt with `Card`, `Button`, `Input`,
  `Dialog`, `Checkbox`, `Tooltip`, and `sonner` toasts.
- **thirdweb signing, not wagmi writes.** The widget calls `useWriteAccount()` and
  uses thirdweb's `prepareContractCall` (approval) + `prepareTransaction` (raw 0x tx)
  to keep the SA-vs-EOA view-mode toggle working.
- **Fixed token list.** No dynamic search — we ship ETH, WETH, USDC, GNARS, DEGEN,
  HIGHER. Adding tokens is a one-line edit in `SwapWidget.tsx`.
