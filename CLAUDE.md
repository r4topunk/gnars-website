# CLAUDE.md

Project guide for the Gnars DAO website.

## Documentation Rules (Must Follow)

- Treat `docs/INDEX.md` as the canonical documentation map.
- All project docs live under `docs/` (except `README.md`, `CLAUDE.md`, and `AGENTS.md`).
- Do not create or update documentation in `tasks/` or `src/**/README.md`.
- When adding, moving, or removing docs, update `docs/INDEX.md` in the same change.
- Docs must reflect the current code. If a doc is stale, update it or delete it.
- **Do not create `.md` or `.sh` files in the repo root.** Only `README.md`, `CLAUDE.md`, and `AGENTS.md` belong there. Scripts go in `scripts/`, docs go in `docs/`.

## Project Overview

This is a Next.js 15.5+ application for the Gnars DAO website, built on Base chain. The site provides a complete DAO interface including auctions, treasury, governance, and member management. It uses the Nouns Builder architecture. Wallet layer is split: **thirdweb owns login + writes + account abstraction**, **wagmi stays as a reads transport only**.

## Development Commands

```bash
# Development server with Turbopack
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## Architecture & Key Patterns

### Tech Stack

- **Framework**: Next.js 15.5 with App Router
- **Styling**: Tailwind CSS 4 with Shadcn/UI components
- **Web3 writes + login**: thirdweb v5 with account abstraction (`accountAbstraction: { chain: base, sponsorGas: true }`)
- **Web3 reads**: wagmi + viem (connectors empty — only transports configured)
- **DAO data**: Builder DAO SDK (`@buildeross/hooks`, `@buildeross/sdk`) + Goldsky subgraph
- **Chain**: Base (chain ID 8453)
- **Package Manager**: pnpm

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Homepage
├── components/
│   └── ui/                # Shadcn/UI components
├── lib/
│   ├── config.ts          # DAO addresses and chain config
│   └── utils.ts           # Utility functions
└── hooks/                 # Custom React hooks (if needed)
```

### Key Configuration Files

- `components.json`: Shadcn/UI configuration (New York style, RSC enabled)
- `tsconfig.json`: TypeScript config with path mapping (`@/*` -> `./src/*`)
- `next.config.ts`: Next.js configuration
- `tailwind.config.*`: Tailwind CSS v4 configuration

### DAO Configuration

The `src/lib/config.ts` file contains all Gnars DAO contract addresses on Base:

- Token (NFT): `0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17`
- Auction: `0x494eaa55ecf6310658b8fc004b0888dcb698097f`
- Governor: `0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c`
- Treasury: `0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88`
- Metadata: `0xdc9799d424ebfdcf5310f3bad3ddcce3931d4b58`
- Lootbox (V4): `DAO_ADDRESSES.lootbox` (update after each deploy)

### Lootbox (V4 Only)

The lootbox UI at `src/app/lootbox/page.tsx` is **V4‑only**:
- Uses `gnarsLootboxV4Abi`.
- Includes admin controls for VRF config, allowlist, deposits, withdrawals, and recovery.
- Shows wallet balances/allowances and listens for the `FlexOpened` event to show NFT win toasts.

## Development Guidelines

### Code Style

- Use TypeScript strictly
- Follow Next.js App Router patterns (Server Components by default, Client Components when needed)
- Use Shadcn/UI components for consistent styling
- Import from path aliases: `@/components`, `@/lib`, etc.

### Web3 Integration

- Chain is hardcoded to Base (chain ID 8453)
- Contract addresses in `src/lib/config.ts`
- **Login**: thirdweb `useConnectModal` (social, email OTP, MetaMask, Coinbase, Rainbow, WalletConnect)
- **Writes**: every onchain write goes through thirdweb `sendTransaction({ account, transaction })` dispatched via `useWriteAccount()` — signer matches the user's view mode (EOA direct vs SA via userop)
- **Reads**: use wagmi `useReadContract`, `useReadContracts`, `useBalance`, `useWaitForTransactionReceipt`, `usePublicClient` — these work without connectors
- **Address**: single source of truth is `useUserAddress()` → `{ address, saAddress, adminAddress, isConnected, isInAppWallet, viewMode, canSwitchView }`. Never call wagmi's `useAccount()` — it's disconnected from thirdweb state
- **View-mode toggle**: external-wallet users can switch between SA view (sponsored gas) and EOA view (native wallet prompt) via `WalletDrawer`. Persisted to localStorage. In-app-wallet users are pinned to SA view
- **Governance pre-checks**: write hooks that gate on voting power pre-read `getPastVotes` / `getVotes` and bail with a toast before prompting signatures
- See `docs/architecture/thirdweb-wallet-layer.md` for the full provider tree and decision matrix

### Data Fetching

- Server Components for initial data loading (SEO, performance)
- Client Components only for interactive features (bidding, voting)
- Utilize Builder DAO subgraph for historical data
- wagmi/viem for real-time blockchain reads in client components

### Responsive Design

- Mobile-first approach with Tailwind breakpoints
- Use Shadcn/UI responsive utilities
- Ensure all DAO features work on mobile devices

## Environment Variables

Required environment variables (see `.env.example`):

```
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"
ALCHEMY_API_KEY=""
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=""
NEXT_PUBLIC_GOLDSKY_PROJECT_ID=""
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=""        # required — login + writes
```

## Important Notes

- This is a single-DAO focused site (Gnars only), not a multi-DAO platform
- Target deployment: Vercel with Next.js optimizations
- Follow security best practices - no secrets in client code
- Use Builder DAO's proven patterns and components where possible
- Don't run `pnpm build` unless explicitly asked

## Pull Request Protocol

**All medium and large tasks MUST be delivered via Pull Request.** Do not commit directly to `main`.

### Task Size Classification

| Size | Criteria | PR Required? |
|------|----------|--------------|
| **Small** | Single-file fix, typo, config tweak, < 20 lines changed | Optional (can commit to main) |
| **Medium** | Multi-file change, new component, feature addition, 20-100 lines | **Yes** |
| **Large** | Cross-cutting change, new feature area, refactor, 100+ lines | **Yes** |

**When in doubt, create a PR.** It's always safer.

### PR Workflow

1. **Create a feature branch** from `main` (or from current branch if stacking):
   - Format: `feat/short-description`, `fix/short-description`, `update/short-description`
   - Use git worktrees for isolation when working on the main repo

2. **Commit with clear messages** as you go — small, atomic commits are preferred

3. **Create the PR** using `gh pr create`:
   - Title: concise, under 70 chars
   - Body: use the template below
   - Always target `main` unless stacking PRs

4. **Report the PR URL** to the user

### PR Body Template

```markdown
## Summary
- [1-3 bullet points describing what changed and why]

## Changes
- [List of key files/areas modified]

## Test plan
- [ ] [How to verify the changes work]

Generated with [Claude Code](https://claude.com/claude-code)
```

### When to Use Worktrees

- When the current working directory has uncommitted changes on another branch
- When implementing a plan that should be isolated from in-progress work
- When the user explicitly asks for isolation

### Stacking PRs

For large features broken into sequential steps:
1. Create first PR targeting `main`
2. Subsequent PRs target the previous feature branch
3. Merge in order, rebasing as needed
