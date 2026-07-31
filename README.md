# Gnars DAO Website

Action sports accelerator and community‑owned brand. Headless so you can shred more.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-000?logo=next.js)](https://nextjs.org/) [![React](https://img.shields.io/badge/React-19-20232a?logo=react)](https://react.dev/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/) [![thirdweb](https://img.shields.io/badge/thirdweb-5-a855f7)](https://thirdweb.com/) [![wagmi](https://img.shields.io/badge/wagmi-2.16-000)](https://wagmi.sh/) [![Viem](https://img.shields.io/badge/viem-2.36-000)](https://viem.sh/)

### What is this?

A modern, performant Next.js App Router site for the Gnars DAO on Base (chain ID 8453), built on the Nouns Builder architecture. It surfaces auctions, governance, treasury, members, Zora coins/droposals, a Farcaster‑powered TV feed, community rounds, and a USDC storefront — with a clean Shadcn UI, TanStack Query for data, and a split thirdweb/wagmi wallet layer for onchain interactions.

## Features

- DAO overview with key stats and recent activity
- Current and historical auctions (grid + trends)
- Treasury dashboard (ETH and token/NFT holdings)
- Governance proposals list, rich detail view, and a creation wizard with voting‑power checks
- Members and delegates views (holders, delegation)
- Zora creator coins + droposals (create-coin, coin-proposal, droposals)
- Propdates (EAS‑attested proposal updates)
- Gnars TV — Farcaster‑aggregated video feed
- Community bounties (POIDH), rounds (NFT‑weighted voting), map, and mural
- USDC‑on‑Base storefront with KeepKey dropship fulfillment
- Farcaster mini‑app support
- Login + sponsored transactions via thirdweb account abstraction
- i18n (EN + PT‑BR) via next-intl
- Dark mode, responsive Shadcn UI, accessible components

## Tech stack

- Next.js 16 (App Router, RSC, Turbopack)
- React 19 + TypeScript 5
- Tailwind CSS v4 + Shadcn UI (New York)
- TanStack Query (react‑query)
- **Wallet layer (split):**
  - **thirdweb v5** — login + writes + account abstraction (`sponsorGas: true`)
  - **wagmi v2 + viem** — reads‑only transport (connectors array is empty)
- next-intl (EN + PT‑BR), MiniSearch (client‑side search workers)
- Recharts, Three.js / react‑three‑fiber, Leaflet, framer‑motion
- Postgres (`pg`) for the rounds subsystem, Nodemailer for order receipts

> **Wallet note:** the user address always comes from `useUserAddress()`. Never call wagmi's `useAccount()` — connectors are empty, so it's intentionally disconnected from thirdweb state. See `docs/architecture/thirdweb-wallet-layer.md`.

## Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm 9+ (recommended) or npm/yarn

## Quick start

1. Install dependencies

```bash
pnpm install
```

2. Configure environment

Create a `.env.local` in the repo root. See `env.example` for the full list; the minimum for login + reads:

```bash
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=   # required (login + writes)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID= # required (WalletConnect)
NEXT_PUBLIC_BASE_RPC_URL=         # optional (defaults to a public Base RPC)
NEXT_PUBLIC_GOLDSKY_PROJECT_ID=   # optional (public default baked in)
ALCHEMY_API_KEY=                  # optional (powers /api/alchemy)
```

3. Run the app

```bash
pnpm dev
# open http://localhost:3000
```

## Scripts

- `pnpm dev` – start dev server (Turbopack)
- `pnpm build` – build for production
- `pnpm start` – start production server
- `pnpm lint` – run ESLint checks (run before opening a PR)
- `pnpm format` / `pnpm format:check` – Prettier write / check
- `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` – vitest unit tests
- `pnpm exec playwright test` – Playwright e2e tests

## Routes

Routing is locale‑based under `src/app/[locale]/` (EN is unprefixed, PT‑BR under `/pt-br`).

- `/` – DAO overview (hero, proposals, charts, recent auctions)
- `/auctions` – all auctions (includes no‑bid auctions)
- `/proposals`, `/proposals/[chain]/[id]` – proposals grid + detail
- `/propose` – create proposal (eligibility + wizard)
- `/treasury` – treasury dashboard
- `/members`, `/members/[address]` – members and delegate profiles
- `/feed` – unified DAO activity feed
- `/propdates`, `/propdates/[txid]` – EAS‑attested proposal updates
- `/droposals`, `/droposals/[id]` – Zora drops from proposals
- `/create-coin`, `/coin-proposal` – Zora creator coin flows
- `/tv`, `/tv/[coinAddress]` – Gnars TV (Farcaster feed)
- `/rounds`, `/rounds/[slug]` – community voting rounds
- `/community/bounties` – POIDH bounties
- `/installations`, `/installations/[slug]` – physical installations
- `/blogs`, `/blogs/[slug]` – blog archive (IPFS)
- `/map`, `/mural`, `/swap`, `/store`, `/nogglesrails`, `/about`

Also: `/md/*` (markdown content negotiation via `src/proxy.ts`), `sitemap.xml`, `robots.ts`, `/dashboard`.

## Configuration

`src/lib/config.ts` is the single source of truth for addresses, chain, subgraphs, and allowlists.

- Chain: Base Mainnet (`id: 8453`)
- Core addresses:
  - `token`: `0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17`
  - `auction`: `0x494eaa55ecf6310658b8fc004b0888dcb698097f`
  - `governor`: `0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c`
  - `treasury`: `0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88`
  - `metadata`: `0xdc9799d424ebfdcf5310f3bad3ddcce3931d4b58`
  - Gnars creator coin (Zora): `0x0cf0c3b75d522290d7d12c74d7f1f0cc47ccb23b`
- Legacy Ethereum L1 addresses (`GNARS_ADDRESSES_ETH`) are retained for historical data — Gnars migrated from mainnet to Base.
- Subgraph: Goldsky Nouns Builder (Base), URL built from `NEXT_PUBLIC_GOLDSKY_PROJECT_ID` with a safe public default.

## Data flow

- Server Components for initial load (SEO, perf); Client Components for interactive flows (bidding, voting, wizards).
- `src/services/*` is the canonical data‑access layer (auctions, proposals, treasury, members, feed, droposals, rounds, store, …).
- Subgraph access via `@buildeross/*` and `src/lib/subgraph.ts`.
- Reads via wagmi hooks; writes via thirdweb `sendTransaction` dispatched through `useWriteAccount()`.
- Rounds is a Postgres‑backed subsystem (`src/services/rounds.ts`), gated behind `ROUNDS_DATABASE_URL`/`DATABASE_URL`.

## Project structure

```text
src/
  app/
    [locale]/                # locale-scoped routes (auctions, proposals, propose, …)
    api/                     # ~24 route groups (alchemy, coins, ens, og, pinata, treasury, …)
    md/                      # markdown content-negotiation target (see proxy.ts)
  components/                # ~28 feature dirs + ui/ (Shadcn)
  hooks/                     # ~39 hooks
  i18n/                      # next-intl config (routing, request, navigation)
  services/                  # data-layer modules
  lib/                       # config, thirdweb, wagmi, subgraph, zora-*, proposal-*, schemas
  workers/                   # client-side MiniSearch workers (blog, proposal)
  proxy.ts                   # Next.js 16 proxy (Accept: text/markdown → /md/*, else next-intl)
```

## Development

- Linting: `pnpm lint` (run before every PR)
- Formatting: `pnpm format`
- Type‑safety: strict TypeScript, isolated modules
- i18n: new UI strings go through next-intl in both locales in the same change
- See `CLAUDE.md` and `docs/INDEX.md` for full conventions and the documentation map

## Deployment

- Vercel recommended (Next.js 16, App Router)
- Set the same env variables in your Vercel project
- Ensure `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` and `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` are set

## Acknowledgements

- Nouns Builder (Builder OSS) – contracts, subgraph and inspiration
- thirdweb – login, account abstraction, sponsored transactions
- Zora – creator coins and drops
- Shadcn UI – headless components and design system

## License

No license file is currently included. If you plan to use or distribute this code, please open an issue to clarify licensing or add a `LICENSE` file (MIT is commonly used).
