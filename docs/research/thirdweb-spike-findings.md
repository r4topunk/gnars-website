# Thirdweb Write-Layer Spike — Findings

Validates Pattern A: wagmi handles wallet connection + all reads, thirdweb handles transaction sending. The bridge wraps the active wagmi connector's EIP-1193 provider via `EIP1193.fromProvider` and sets it as thirdweb's active wallet.

## What was built

- `src/lib/thirdweb.ts` — lazy singleton `getThirdwebClient()`, reads `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`, logs a one-shot warning and returns `undefined` when the env var is missing.
- `src/components/layout/Providers.tsx` — nests `ThirdwebProvider` inside `QueryClientProvider`. Tree is now `WagmiProvider -> QueryClientProvider -> ThirdwebProvider -> children`. Both libraries coexist.
- `src/hooks/use-thirdweb-wallet.ts` — bridge hook. On wagmi account/connector change, grabs `connector.getProvider()`, wraps with `EIP1193.fromProvider`, calls `wallet.connect({ client, chain })`, then `setActiveWallet(wallet)`. Handles cancellation, client-missing, and disconnect cleanup.
- `src/hooks/use-user-address.ts` — unified `useUserAddress()` returning `{ address, isConnected, source }`. Prefers thirdweb's active account, falls back to wagmi.
- `src/app/spike/thirdweb/page.tsx` — diagnostic page at `/spike/thirdweb` showing wagmi state, thirdweb state, unified address, and a "Send 0 ETH to self" button that calls thirdweb's `useSendTransaction` with `prepareTransaction`.
- `.env.example` — new `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` entry.

## How to test

1. Set `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` in `.env.local` (get one from https://thirdweb.com/dashboard).
2. `pnpm dev` and navigate to `/spike/thirdweb`.
3. **Browser context**: connect with MetaMask or Coinbase Wallet via the normal site header, then visit `/spike/thirdweb`. Confirm wagmi address and thirdweb address match, then click "Send 0 ETH to self" and approve the tx in the wallet. Confirm the BaseScan link shows the transaction.
4. **Farcaster mini app context**: open the site inside Warpcast. The custom `farcasterWallet()` wagmi connector auto-connects, and the bridge should pick up `sdk.wallet.getEthereumProvider()` via `connector.getProvider()`. Confirm the same flow works without leaving the mini app.

## What this proves

- A wagmi connector's provider can be wrapped as a thirdweb wallet via `EIP1193.fromProvider` without touching the connector itself.
- After `setActiveWallet`, every thirdweb React hook (`useActiveAccount`, `useActiveWallet`, `useSendTransaction`) reflects the bridged account.
- `prepareTransaction` + `useSendTransaction` works end-to-end against Base through the bridged wallet.
- The bridge hook handles wagmi account/connector changes and runs cleanup on unmount.
- The unified `useUserAddress` hook gives a single answer about "the user's effective address" regardless of whether thirdweb AA is on.

## What this does NOT prove

- **Account abstraction** — the spike intentionally skips `accountAbstraction: { chain, sponsorGas }` on `useConnect`. Adding AA may interact with `EIP1193.fromProvider` in ways we haven't validated. For the Farcaster context specifically, the Warpcast wallet is already a Coinbase Smart Wallet — do NOT stack thirdweb AA on top.
- **Batch reads regression mitigation** — `useReadContracts` continues to work through wagmi; thirdweb's lack of a batch read hook is not exercised here.
- **Event watching** — `useWatchContractEvent` is not touched. Auction live updates and lootbox event watchers still use wagmi as before.
- **Any existing write path** — none of the 23 existing write hooks were migrated. Migration order remains a follow-up decision (POIDH is the highest-duplication payoff; auction bidding is the highest user value with gasless).

## Known caveats

- The bridge hook is currently mounted only on the spike page. For production, it should move into `Providers.tsx` (or a sibling provider) so every page has access to the bridged thirdweb account. That is an intentional spike-scope limitation.
- TypeScript casts `connector.getProvider()` via `Parameters<typeof EIP1193.fromProvider>[0]["provider"]`. wagmi's connector provider type is `unknown`, so some cast is unavoidable. If thirdweb loosens the type or exports `EIP1193Provider`, we can improve this.
- `setActiveWallet` is assumed stable (from React context). If thirdweb changes that contract the effect could loop.
- The spike does not attempt to clear the thirdweb active wallet on wagmi disconnect. Disconnect cleanup only happens on unmount.

## Next steps (if the spike is green)

1. Lift `useThirdwebWallet` into the provider layer so the bridge is global.
2. Pick one existing write hook as a migration pilot. Recommended: `useDelegate` — short, well-understood, and delegation is required for the migration UX anyway.
3. Build a small `useContractAction` wrapper that mirrors thirdweb's `prepareContractCall + useSendTransaction` shape and replaces the wagmi `useWriteContract + useWaitForTransactionReceipt + useSwitchChain` trio in one call site.
4. Once one hook is proven, refactor the POIDH contract hook (10 duplicated writes) as the biggest-payoff second target.
5. Decide AA strategy for browser context (Warpcast stays as-is). Choose between `inAppWallet` with AA prop, or keeping external wallets and adding AA via the `useConnect` prop after validating it works through the bridge.
