# Copilot Instructions — Gnars DAO Website

## Project Overview

Gnars DAO website on Base chain (ID 8453). Single-DAO focused app with auctions, governance, treasury, and member features. Uses Nouns Builder architecture.

## Tech Stack & Core Patterns

- **Framework**: Next.js 15.5 App Router, React 19, TypeScript 5, pnpm
- **Styling**: Tailwind CSS v4 + Shadcn UI (New York style), `cva` for variants
- **Web3**: wagmi v2 + viem for contracts, `@buildeross/sdk` for DAO data, `@zoralabs/coins-sdk` for content coins
- **Data**: TanStack Query for client state, Goldsky subgraph for historical data

## Architecture & Data Flow

```
src/
├── app/                 # App Router pages (Server Components by default)
├── components/          # UI components (presentational)
├── hooks/               # TanStack Query hooks + wagmi contract hooks
├── services/            # Data fetching (subgraph queries, transformations)
└── lib/                 # Config, utils, types, schemas
```

**Data pipeline**: `subgraph.ts` → `services/*.ts` → `hooks/use-*.ts` → components

- **Server fetching**: Pages fetch via services directly (see `src/app/proposals/page.tsx`)
- **Client fetching**: Use TanStack Query hooks from `src/hooks/` (e.g., `useRecentAuctions`)
- **Contract reads**: Use `useReadContracts` from wagmi (see `src/hooks/useVotes.ts`)
- **Contract writes**: Use `useWriteContract` + `useSendTransaction` (see `src/hooks/useCastVote.ts`)

## Key Files

- `src/lib/config.ts` — DAO addresses, chain config, subgraph URL
- `src/lib/wagmi.ts` — Wallet config (Base chain, Farcaster mini app support)
- `src/lib/subgraph.ts` — GraphQL query helper (`cache: "no-store"`)
- `src/components/layout/Providers.tsx` — QueryClient + WagmiProvider setup

## Commands

```bash
pnpm dev       # Start with Turbopack
pnpm lint      # Validate code changes
pnpm build     # Production build (only when requested)
```

## Coding Conventions

### Components

- Server Components by default; add `"use client"` only for interactivity
- Max 200 lines per file; extract hooks/subcomponents if larger
- Use named exports; default only for Next.js page/layout files
- Every async view needs: loading skeleton, error state, empty state

### Hooks & Data

- Hooks in `src/hooks/` wrap TanStack Query with typed `queryKey` patterns
- Services in `src/services/` handle subgraph queries + transformations
- Avoid `useEffect` for data fetching—use Query hooks or server fetching

### Web3 Patterns

- All contract addresses centralized in `src/lib/config.ts`
- Use `@buildeross/sdk` for proposal data (see `src/services/proposals.ts`)
- Use `@zoralabs/coins-sdk` for content coin creation/trading
- Transaction encoding: `src/lib/proposal-utils.ts`

### Styling

- Class order: layout → box → typography → visuals → state → responsive
- Use `cn()` for conditional classes, `cva` for component variants
- Never overwrite Shadcn component internals—extend via className
- Use `gap-*` instead of `space-*`

## Task Workflow

1. Create task folder: `tasks/<task-id>/`
2. Research → write `research.md` (existing patterns, files, constraints)
3. Plan → write `plan.md` (approach, steps, acceptance criteria)
4. Implement → track progress with todo list

## Important Context

- Farcaster mini app integration enabled (`src/lib/miniapp-config.ts`)
- Treasury uses Alchemy API proxy at `/api/alchemy` for token balances
- Proposal creation supports custom transactions including Zora coin purchases
- Droposals are NFT drops via Zora contracts (`DROPOSAL_TARGET` in config)
