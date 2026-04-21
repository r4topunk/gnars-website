# CLAUDE.md

Project guide for the Gnars DAO website. Keep terse, keep current.

## Documentation Rules (Must Follow)

- `docs/INDEX.md` is the canonical documentation map. Update it in the same change when adding/moving/removing docs.
- All project docs live under `docs/`. Root allows only `README.md`, `CLAUDE.md`, `AGENTS.md`.
- No docs in `tasks/` or `src/**/README.md`. Scripts go in `scripts/`.
- Docs must reflect current code. Stale doc → update or delete.
- `AGENTS.md` covers subagent routing only; do not duplicate these rules there.

## Project Overview

Next.js 15.5 App Router site for Gnars DAO on Base (chain ID 8453). Built on Nouns Builder architecture. Wallet layer is split:
- **thirdweb v5** — login + writes + account abstraction (`sponsorGas: true`)
- **wagmi v2 + viem** — reads transport only (connectors array empty)

## Commands

```bash
pnpm dev           # dev server (Turbopack)
pnpm build         # prod build (do not run unless asked)
pnpm start         # prod server
pnpm lint          # eslint — run before PR
pnpm format        # prettier write
pnpm format:check  # prettier check
pnpm exec playwright test  # e2e tests (tests/e2e/)
```

No unit test runner; Playwright e2e only. `tests/e2e/propdates.spec.ts`, `tests/e2e/gnars-gov.spec.ts`.

## Source Layout

```
src/
├── app/              # App Router — 25+ routes incl. /auctions /proposals /propose /tv /members /treasury /lootbox /feed /propdates /droposals /installations /blogs /coin-proposal /community/bounties /map /mural
│   ├── api/          # 18 route groups (alchemy, coins, ens, og, pinata, propdates, proposals, treasury, tv, …)
│   └── md/           # markdown content-negotiation target (see middleware)
├── components/       # 24 feature dirs + ui/ (shadcn)
├── hooks/            # 40 hooks — see naming note below
├── services/         # 16 data-layer modules (auctions, proposals, treasury, feed, members, farcaster, poidh, snapshot, …)
├── lib/              # config.ts, thirdweb.ts, wagmi.ts, subgraph.ts, ipfs.ts, zora-*, proposal-*, og-*, schemas/, types/
├── data/             # static JSON (installations.json)
├── types/            # shared TS interfaces
├── utils/abis/       # contract ABIs (gnarsLootboxV4Abi, erc20, …)
├── workers/          # client-side search workers (blog, proposal)
└── proxy.ts          # Accept: text/markdown → rewrite to /md/* (Next.js 16 proxy convention, formerly middleware.ts)
```

### Hook naming (drift to be aware of)

31 files use `use-kebab-case.ts`, 9 use `useCamelCase.ts` (`useCastVote`, `useCreateCoin`, `useDelegate`, `useMintDroposal`, `usePoidhBounties`, `useVotes`, etc.). Prefer kebab-case for new hooks; don't rename existing ones speculatively.

## Key Config Files

- `src/lib/config.ts` — **single source of truth** for DAO addresses, chain, Zora creator allowlist, subgraph URLs, treasury token allowlist. Do not duplicate addresses elsewhere.
- `components.json` — shadcn/ui (New York, RSC on)
- `tsconfig.json` — path alias `@/* → src/*`
- `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `playwright.config.ts`

## Web3 Integration

- Chain hardcoded to Base (8453).
- **Login** — thirdweb `useConnectModal` (social, email OTP, MetaMask, Coinbase, Rainbow, WalletConnect).
- **Writes** — every onchain write goes through thirdweb `sendTransaction({ account, transaction })` dispatched via `useWriteAccount()`. Signer matches the user's view mode (EOA direct vs SA via userop).
- **Reads** — wagmi `useReadContract`, `useReadContracts`, `useBalance`, `useWaitForTransactionReceipt`, `usePublicClient`. Works with no connectors.
- **Address** — single source is `useUserAddress()` → `{ address, saAddress, adminAddress, isConnected, isInAppWallet, viewMode, canSwitchView }`. **Never call wagmi's `useAccount()`** — it's disconnected from thirdweb state.
- **View-mode toggle** — external-wallet users can switch SA (sponsored) vs EOA (native prompt) via `WalletDrawer`; persisted to localStorage. In-app wallets pinned to SA.
- **Governance pre-checks** — write hooks that gate on voting power must pre-read `getPastVotes` / `getVotes` and bail with a toast before prompting signatures.
- Full provider tree + decision matrix: `docs/architecture/thirdweb-wallet-layer.md`.

### Lootbox (V4 only)

- UI at `src/app/lootbox/page.tsx`, ABI `src/utils/abis/gnarsLootboxV4Abi.ts`, hooks `use-lootbox-contract.ts` + `use-lootbox-actions.ts`.
- Admin controls for VRF config, allowlist, deposits, withdrawals, recovery.
- Listens for `FlexOpened` event (in `use-lootbox-contract.ts`) to surface NFT win toasts.
- Address from `DAO_ADDRESSES.lootbox` in `config.ts` — update after each deploy.

## Data Fetching

- Server Components for initial load (SEO, perf).
- Client Components only for interactive features (bidding, voting, wizard forms).
- Builder DAO subgraph (Goldsky) for historical data via `@buildeross/hooks` / `@buildeross/sdk`.
- `src/services/*` is the canonical data-access layer — prefer it over inline fetches.

## Styling

- Tailwind CSS v4, shadcn/ui components (New York).
- Mobile-first; all DAO features must work on mobile.
- Dark mode via `next-themes`.

## Environment Variables

Full list in `env.example`. Summary:

```
# Site
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_BASE_URL

# RPC / chain
ALCHEMY_API_KEY
NEXT_PUBLIC_ALCHEMY_API_KEY
NEXT_PUBLIC_BASE_RPC_URL
BASE_RPC
BASESCAN_API_KEY

# Web3 auth (required for login + writes)
NEXT_PUBLIC_THIRDWEB_CLIENT_ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

# Subgraph / data
NEXT_PUBLIC_GOLDSKY_PROJECT_ID
NEXT_PUBLIC_ZORA_COINS_SUBGRAPH_URL

# External APIs
NEXT_PUBLIC_ZORA_API_KEY
COINGECKO_API_KEY
PINATA_JWT
NEYNAR_API_KEY

# Optional
USDC_BASE
```

Secrets never go in client code. `NEXT_PUBLIC_*` is public by definition.

## Notable Dependencies

- Web3: `thirdweb`, `wagmi`, `viem`, `@buildeross/hooks`, `@buildeross/sdk`, `@0xsplits/splits-sdk`
- Creator coins: `@zoralabs/coins-sdk`
- Social: `@farcaster/miniapp-sdk`
- 3D / viz: `three`, `@react-three/fiber`, `@react-three/drei`, `react-globe.gl`, `ogl`, `gsap`, `recharts`
- Maps: `leaflet`, `react-leaflet`, `leaflet-draw`, `leaflet.markercluster`
- Forms: `react-hook-form`, `zod`
- `@rainbow-me/rainbowkit` is in `package.json` but unused in `src/` — slated for removal.

## Important Notes

- Single-DAO site (Gnars only), not a multi-DAO platform.
- Deploy target: Vercel.
- Do not run `pnpm build` unless explicitly asked.
- Before PR: `pnpm lint` + `pnpm format:check`.

## Pull Request Protocol

All medium and large tasks MUST be delivered via Pull Request. Do not commit directly to `main`.

| Size | Criteria | PR Required? |
|------|----------|--------------|
| **Small** | Single-file fix, typo, config tweak, <20 lines | Optional |
| **Medium** | Multi-file, new component, 20–100 lines | **Yes** |
| **Large** | Cross-cutting, refactor, 100+ lines | **Yes** |

When in doubt, create a PR.

### Workflow

1. Branch from `main` (or stack from prior feature branch). Format: `feat/*`, `fix/*`, `update/*`. Use a git worktree when the main repo has unrelated work in progress.
2. Small atomic commits with clear messages.
3. `gh pr create` with title <70 chars and the body template below. Target `main` unless stacking.
4. Report the PR URL to the user.

### PR Body Template

```markdown
## Summary
- [1-3 bullets: what changed and why]

## Changes
- [key files/areas modified]

## Test plan
- [ ] [how to verify]

Generated with [Claude Code](https://claude.com/claude-code)
```

### Worktrees

Use when: current dir has uncommitted work on another branch; implementing a plan that needs isolation; user asks for isolation.

### Stacking

First PR → `main`. Subsequent PRs target the previous feature branch. Merge in order; rebase as needed.
