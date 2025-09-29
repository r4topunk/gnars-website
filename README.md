# Gnars DAO Website

Action sports accelerator and community‑owned brand. Headless so you can shred more.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-000?logo=next.js)](https://nextjs.org/) [![React](https://img.shields.io/badge/React-19-20232a?logo=react)](https://react.dev/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/) [![wagmi](https://img.shields.io/badge/wagmi-2.16-000)](https://wagmi.sh/) [![Viem](https://img.shields.io/badge/viem-2.36-000)](https://viem.sh/)

### What is this?

A modern, performant Next.js app for the Gnars DAO on Base. It surfaces auctions, proposals, treasury data, members, and enables creating proposals—using a clean Shadcn UI, TanStack Query for data, and wagmi/viem for onchain interactions.

## Features

- DAO overview with key stats and recent activity
- Current and historical auctions (grid + trends)
- Treasury dashboard (ETH and token/NFT holdings)
- Governance proposals list and rich detail view
- Proposal creation wizard with voting‑power checks
- Members and delegates views (holders, delegation)
- Wallet connect (MetaMask, Coinbase Wallet, WalletConnect)
- Dark mode, responsive Shadcn UI, accessible components

## Tech stack

- Next.js 15 (App Router, RSC)
- React 19 + TypeScript 5
- Tailwind CSS v4 + Shadcn UI
- TanStack Query (react‑query)
- wagmi v2 + viem for Base onchain
- Recharts for charts

## Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm 9+ (recommended) or npm/yarn

## Quick start

1. Install dependencies

```bash
pnpm install
# or
npm install
```

2. Configure environment

Create a `.env.local` in the repo root:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID= # required (wagmi walletConnect)
NEXT_PUBLIC_BASE_RPC_URL= # optional (defaults to mainnet)
NEXT_PUBLIC_GOLDSKY_PROJECT_ID= # optional (public default baked in)
ALCHEMY_API_KEY= # optional (powers /api/alchemy)
```

3. Run the app

```bash
pnpm dev
# open http://localhost:3000
```

## Scripts

- `pnpm dev` – start dev server (Turbopack)
- `pnpm build` – build for production (Turbopack)
- `pnpm start` – start production server
- `pnpm lint` – run ESLint checks (use this to validate code changes)
- `pnpm format` – format with Prettier
- `pnpm format:check` – check formatting

## Routes

- `/` – DAO overview (hero, proposals, charts, recent auctions)
- `/auctions` – all auctions (includes no‑bid auctions)
- `/proposals` – proposals grid
- `/proposals/[id]` – proposal detail
- `/propose` – create proposal (eligibility + wizard)
- `/treasury` – treasury dashboard
- `/members` – members and delegates

## Configuration

- Chain: Base Mainnet (`id: 8453`)
- Core addresses (from `src/lib/config.ts`):
  - `token`: `0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17`
  - `auction`: `0x494eaa55ecf6310658b8fc004b0888dcb698097f`
  - `governor`: `0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c`
  - `treasury`: `0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88`
  - `metadata`: `0xdc9799d424ebfdcf5310f3bad3ddcce3931d4b58`
- Subgraph: Goldsky Nouns Builder (Base)
  - URL built from `NEXT_PUBLIC_GOLDSKY_PROJECT_ID` with a safe public default

## Data flow

- Subgraph access via `src/lib/subgraph.ts` (POST GraphQL; `no-store` cache)
- Auctions via `src/services/auctions.ts` + `src/hooks/use-auctions.ts`
- Voting power via `src/hooks/useVotes.ts` (wagmi `useReadContracts`)
- Wallet + RPC via `src/lib/wagmi.ts` (WalletConnect/MetaMask/Coinbase)
- Optional Alchemy proxy endpoints via `src/app/api/alchemy/route.ts`

## Project structure

```text
src/
  app/
    api/alchemy/route.ts     # Alchemy JSON-RPC proxy (optional)
    auctions/page.tsx        # All auctions
    proposals/[id]/page.tsx  # Proposal detail
    proposals/page.tsx       # Proposals list
    propose/page.tsx         # Proposal creation wizard
    treasury/page.tsx        # Treasury dashboard
    members/page.tsx         # Members & delegates
    layout.tsx, page.tsx, globals.css
  components/                # UI and feature components (Shadcn based)
  hooks/                     # React Query hooks (auctions, votes)
  lib/                       # Config, wagmi, subgraph utils
  services/                  # Data services (auctions, etc.)
```

## Development

- Linting: `pnpm lint` (preferred for validation)
- Formatting: `pnpm format`
- Type‑safety: strict TypeScript, isolated modules
- Images: Next Image remote patterns are open (`https://**`)

## Deployment

- Vercel recommended (Next.js 15, App Router)
- Set the same `.env` variables in your Vercel project
- Ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set for wallet connections

## Acknowledgements

- Nouns Builder (Builder OSS) – contracts, subgraph and inspiration
- Coinbase OnchainKit – wallet UX patterns
- Shadcn UI – headless components and design system

## License

No license file is currently included. If you plan to use or distribute this code, please open an issue to clarify licensing or add a `LICENSE` file (MIT is commonly used).
