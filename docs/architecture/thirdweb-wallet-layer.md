# Thirdweb Wallet Layer

Authoritative reference for the wallet architecture of the Gnars DAO site. **Thirdweb owns login + writes + account abstraction. Wagmi stays as a reads transport only.**

## Provider Tree

```
WagmiProvider              (reads only — empty connectors, transports)
  QueryClientProvider
    ThirdwebProvider       (login, wallet state, writes)
      ThirdwebBootstrap    (useAutoConnect + Farcaster miniapp adapter)
        ViewAccountProvider
          <app>
```

Defined in `src/components/layout/Providers.tsx`. Instances are module-level singletons to avoid double-mount warnings in dev.

## Responsibility Split

| Concern | Owner | Why |
|---------|-------|-----|
| Login UI + wallet state | thirdweb `useConnectModal` / `useActiveAccount` / `useActiveWallet` | Handles social auth, email OTP, external wallets uniformly. AA applied via `accountAbstraction: { chain: base, sponsorGas: true }`. |
| Writes (onchain sends) | thirdweb `sendTransaction({ account, transaction })` dispatched through `useWriteAccount()` | Account abstraction baked in. Per-user view mode controls whether the signer is the SA (sponsored gas userop) or the admin EOA (native wallet prompt, user pays gas). |
| Reads (contract calls, balances, receipts) | wagmi `useReadContract`, `useReadContracts`, `useBalance`, `useWaitForTransactionReceipt`, `useBlockNumber`, `usePublicClient`, `useSimulateContract`, `useWatchContractEvent` | Works without connectors — only transports configured. ~92 read sites across the app. |
| Session restore | `ThirdwebBootstrap` → `useAutoConnect` | Rehydrates the active wallet on reload. Must be inside `ThirdwebProvider`. |
| Farcaster miniapp auto-connect | `ThirdwebBootstrap` → `EIP1193.fromProvider` + `setActiveWallet` | Wraps the Warpcast EIP-1193 provider as a thirdweb wallet so users enter the app already connected. |

## Core Primitives

| File | Exports | Role |
|------|---------|------|
| `src/lib/thirdweb.ts` | `getThirdwebClient()`, `THIRDWEB_CHAIN` | Client singleton |
| `src/lib/thirdweb-wallets.ts` | `THIRDWEB_WALLETS`, `THIRDWEB_AA_CONFIG` | Wallet list (inAppWallet + MetaMask + Coinbase + Rainbow + WalletConnect) and AA options passed to every thirdweb hook entry point |
| `src/lib/thirdweb-tx.ts` | `normalizeTxError()`, `ensureOnChain()` | Shared tx helpers (error normalization, chain switch before write) |
| `src/hooks/use-user-address.ts` | `useUserAddress()` | **Single source of truth for the user's address.** Returns `{ address, saAddress, adminAddress, isConnected, isInAppWallet, viewMode, canSwitchView }`. `address` reflects the viewed account per view mode; `saAddress` / `adminAddress` are raw, always both sides. |
| `src/hooks/use-write-account.ts` | `useWriteAccount()` | Picks the signing account based on view mode. Pass `writer.account` to `sendTransaction`. |
| `src/components/layout/ViewAccountContext.tsx` | `ViewAccountProvider`, `useViewAccount()` | Client-side view-mode state, persisted to `localStorage` under `gnars:view-as` |
| `src/components/layout/ThirdwebBootstrap.tsx` | `ThirdwebBootstrap` | Session restore + Farcaster miniapp adapter |

## View Mode: SA vs EOA

Per-user toggle in `WalletDrawer` ("Switch to admin" / "Switch to wallet"), gated on `canSwitchView` (true iff the user has an external wallet with a distinct admin EOA).

| Wallet shape | Default view | Can toggle? | Writes sign from |
|--------------|--------------|-------------|------------------|
| External wallet (MetaMask / Coinbase / Rainbow / WalletConnect) with AA on | **EOA** | Yes | Admin EOA directly. Real "Confirm Transaction" prompt. User pays gas. Real tx hash. |
| External wallet, view toggled to SA | SA | Yes | Active (SA) account. Bundled as userop. Sponsored gas. "Sign Message" prompt shows userop hash. |
| In-app wallet (social / email OTP) | **SA** | No (no distinct admin EOA to expose) | Active account. Sponsored gas. |
| Farcaster miniapp | SA | No | Active account. |

Default for fresh connection: `viewMode === null` → `useUserAddress` applies the shape-aware fallback (EOA for external wallets, SA otherwise). User's explicit toggle is persisted.

## Write Path

Every write hook in the app follows this shape:

```ts
const writer = useWriteAccount();

const handleWrite = async () => {
  if (!writer) return toast.error("Connect wallet");
  await ensureOnChain(writer.wallet, base);

  const tx = prepareContractCall({ contract, method, params });
  const result = await sendTransaction({
    account: writer.account,
    transaction: tx,
  });

  await waitForReceipt({ client, chain: base, transactionHash: result.transactionHash });
};
```

Write hooks that gate on voting power (`useCastVote`, `ProposalPreview` propose) pre-read `governor.proposalSnapshot` + `token.getPastVotes` (or `proposalThreshold` + `getVotes`) on the effective signer and bail with a clear toast before any signature prompt.

## Read Path

Continue using wagmi hooks. No change from pre-migration patterns, except **always source the user address from `useUserAddress()` rather than `useAccount()`** — wagmi's connector list is empty, so `useAccount()` is disconnected from the real session.

## Known Escape Hatches

- `src/components/tv/GnarsTVFeed.tsx:handleBuyCoin` — Zora's `tradeCoin` SDK requires a viem `WalletClient` and signs from whatever thirdweb considers the active account. This bypasses `useWriteAccount`, so view-mode toggles do not apply to Zora buys. Revisit if Zora exposes a lower-level call builder.
- `src/app/members/[address]/page.tsx` — `resolveSmartAccountOwner` reads the chain on every profile request to detect whether the URL address is a thirdweb SA. Cached; see the `unstable_cache` wrapper in that file.

## Why Not Full Thirdweb or Full Wagmi?

- **Wagmi alone**: no AA out of the box. Every write hook would re-implement paymaster dispatch + userop signing. Social login would need a custom wagmi connector per auth provider.
- **Thirdweb alone**: ~92 read sites across the codebase lean on wagmi's React Query integration and TS ergonomics. Rewriting them all buys no capability and costs a lot of churn.
- **Split**: thirdweb handles the one thing wagmi can't (AA + social login), wagmi handles the one thing thirdweb's React layer is thinner on (idiomatic read hooks tied to React Query).

## Environment Variables

| Var | Required | Purpose |
|-----|----------|---------|
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | **Yes** | Enables login + writes. Get one at https://thirdweb.com/dashboard. |

AA is on by default for every wallet in the app via `THIRDWEB_AA_CONFIG` (`src/lib/thirdweb-wallets.ts`) — no env toggle.

## Related PRs

- PR #59 — `feat(thirdweb): migrate all write paths to thirdweb via wagmi bridge`
