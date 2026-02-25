# Gnars Website Exploration Progress

_Last updated: 2026-01-15_

## Goals

- Build a complete inventory of the Next.js App Router surface.
- Capture key UI domains, data services, and API routes.
- Note caching/runtime patterns and client/server boundaries.

## Status

- ✅ Routes, layouts, loading states mapped.
- ✅ Component domains inventoried.
- ✅ Services, hooks, and core libs reviewed.
- ✅ Deep dive notes added across app + API routes.

## App Router Surface

### Pages

- `/` (`src/app/page.tsx`)
- `/auctions` (`src/app/auctions/page.tsx`)
- `/blogs` (`src/app/blogs/page.tsx`)
- `/blogs/[slug]` (`src/app/blogs/[slug]/page.tsx`)
- `/coin-proposal` (`src/app/coin-proposal/page.tsx`)
- `/create-coin` (`src/app/create-coin/page.tsx`)
- `/debug/tv` (`src/app/debug/tv/page.tsx`)
- `/droposals` (`src/app/droposals/page.tsx`)
- `/droposals/[id]` (`src/app/droposals/[id]/page.tsx`)
- `/feed` (`src/app/feed/page.tsx`)
- `/lootbox` (`src/app/lootbox/page.tsx`)
- `/members` (`src/app/members/page.tsx`)
- `/members/[address]` (`src/app/members/[address]/page.tsx`)
- `/members/[address]/test-og` (`src/app/members/[address]/test-og/page.tsx`)
- `/mural` (`src/app/mural/page.tsx`)
- `/propdates` (`src/app/propdates/page.tsx`)
- `/propdates/[txid]` (`src/app/propdates/[txid]/page.tsx`)
- `/proposals` (`src/app/proposals/page.tsx`)
- `/proposals/[id]` (`src/app/proposals/[id]/page.tsx`)
- `/propose` (`src/app/propose/page.tsx`)
- `/treasury` (`src/app/treasury/page.tsx`)
- `/tv` (`src/app/tv/page.tsx`)
- `/tv/[coinAddress]` (`src/app/tv/[coinAddress]/page.tsx`)

### Layouts

- Root layout (`src/app/layout.tsx`)
- Droposals layout (`src/app/droposals/layout.tsx`)
- Proposals layout (`src/app/proposals/layout.tsx`)
- TV layout (`src/app/tv/layout.tsx`)
- TV coin layout (`src/app/tv/[coinAddress]/layout.tsx`)

### Loading States

- Proposals list (`src/app/proposals/loading.tsx`)
- Proposal detail (`src/app/proposals/[id]/loading.tsx`)
- Propdates list (`src/app/propdates/loading.tsx`)
- Propdate detail (`src/app/propdates/[txid]/loading.tsx`)

## API Routes

- `/api/alchemy` (`src/app/api/alchemy/route.ts`)
- `/api/coins/create` (`src/app/api/coins/create/route.ts`)
- `/api/coins/gnars-paired` (`src/app/api/coins/gnars-paired/route.ts`)
- `/api/ens` (`src/app/api/ens/route.ts`)
- `/api/eth-price` (`src/app/api/eth-price/route.ts`)
- `/api/member-og-data/[address]` (`src/app/api/member-og-data/[address]/route.ts`)
- `/api/members` (`src/app/api/members/route.ts`)
- `/api/members/active` (`src/app/api/members/active/route.ts`)
- `/api/pinata/upload` (`src/app/api/pinata/upload/route.ts`)
- `/api/prices` (`src/app/api/prices/route.ts`)
- `/api/proposals` (`src/app/api/proposals/route.ts`)
- `/api/proposals/[id]` (`src/app/api/proposals/[id]/route.ts`)
- `/api/proposals/per-month` (`src/app/api/proposals/per-month/route.ts`)
- `/api/supporters` (`src/app/api/supporters/route.ts`)
- `/api/treasury/performance` (`src/app/api/treasury/performance/route.ts`)
- `/api/tv/feed` (`src/app/api/tv/feed/route.ts`)

## Component Domains

- Auctions (`src/components/auctions`)
- Blogs (`src/components/blogs`)
- Coin proposals (`src/components/coin-proposal`)
- Common UI (`src/components/common`)
- Droposals (`src/components/droposals`)
- Feed (`src/components/feed`)
- Hero/Hero section (`src/components/hero`, `src/components/hero-section.tsx`)
- Home (`src/components/home`)
- Layout (`src/components/layout`)
- Lootbox (`src/components/lootbox`)
- Members (`src/components/members`, `src/components/member-detail`)
- Miniapp (`src/components/miniapp`)
- Propdates (`src/components/propdates`)
- Proposals (`src/components/proposals`)
- Skeleton loaders (`src/components/skeletons`)
- Treasury (`src/components/treasury`)
- TV (`src/components/tv`)
- Shared UI kit (`src/components/ui`)

## Services (Server/Data Fetching)

- Auctions from subgraph (`src/services/auctions.ts`)
- Blogs via Paragraph API + cache (`src/services/blogs.ts`)
- DAO stats from subgraph (`src/services/dao.ts`)
- Droposals by decoding proposal calldata (`src/services/droposals.ts`)
- Feed events from subgraph with `unstable_cache` (`src/services/feed-events.ts`)
- Members data from subgraph with batching (`src/services/members.ts`)
- Proposals via Builder SDK (`src/services/proposals.ts`)
- Propdates via EAS SDK + TTL cache (`src/services/propdates.ts`)

## Hooks (Client/Data)

- Auctions, treasury, and charts (`src/hooks/use-auctions.ts`, `src/hooks/use-treasury-*.ts`, `src/hooks/use-*-per-month.ts`)
- Proposal helpers (`src/hooks/useCastVote.ts`, `src/hooks/useVotes.ts`, `src/hooks/use-proposal-search.ts`)
- Members/delegation (`src/hooks/useDelegate.ts`, `src/hooks/use-member-activity.ts`, `src/hooks/use-active-members.ts`)
- Droposals/lootbox (`src/hooks/useMintDroposal.ts`, `src/hooks/use-lootbox-*.ts`)
- Coins (`src/hooks/useCreateCoin.ts`, `src/hooks/use-batch-coin-purchase.ts`, `src/hooks/use-trade-creator-coin.ts`)
- UX helpers (`src/hooks/use-mobile.ts`, `src/hooks/use-ens.ts`, `src/hooks/use-blog-search.ts`)

## Core Libs/Config

- Chain + contract addresses (`src/lib/config.ts`)
- Subgraph fetch helper (`src/lib/subgraph.ts`)
- Wagmi config + connectors (`src/lib/wagmi.ts`)
- Miniapp config (`src/lib/miniapp-config.ts`)
- Utilities, IPFS helpers, droposal and proposal utils (`src/lib/utils.ts`, `src/lib/ipfs.ts`, `src/lib/droposal-utils.ts`, `src/lib/proposal-utils.ts`)

## Notable Patterns

- Subgraph requests use `fetch(..., { cache: "no-store" })` in `src/lib/subgraph.ts`.
- Multiple routes opt into `dynamic = "force-dynamic"` for realtime data.
- TV feed API combines Zora SDK + subgraph + droposals and performs concurrency-limited RPC work.
- Paragraph blog fetching uses `unstable_cache` for publication metadata.

## Deep Dive Notes

### TV

- Page routes: `/tv` and `/tv/[coinAddress]` render `GnarsTVFeed` with `dynamic = "force-dynamic"` (`src/app/tv/page.tsx`, `src/app/tv/[coinAddress]/page.tsx`).
- Feed client (`src/components/tv/GnarsTVFeed.tsx`) is a fullscreen vertical feed with virtualization, preloading, and scroll snapping; uses `useTVFeed`, `useVideoPreloader`, `useRenderBuffer`.
- Player (`src/components/tv/TVVideoPlayer.tsx`) converts IPFS to HTTP, uses Next `Image` for posters, tracks loading/buffering states, and manages autoplay safety flags.
- API route `/api/tv/feed` pulls Zora coin holders + profiles + paired coins + droposals with concurrency limits and multicall checks (`src/app/api/tv/feed/route.ts`).

### Proposals

- List page server-fetches via `listProposals` and renders client search/filter UI (`src/app/proposals/page.tsx`, `src/components/proposals/ProposalsView.tsx`).
- Detail page server-fetches by ID/number and renders `ProposalDetail` client view with voting, propdates, and transaction visualization (`src/app/proposals/[id]/page.tsx`, `src/components/proposals/detail/ProposalDetail.tsx`).
- Builder (`src/app/propose/page.tsx`) uses `ProposalWizard` + `TransactionBuilder` (multi-transaction, type-specific forms).

### Lootbox

- `/lootbox` is fully client-side; uses `useLootboxContract` + `useLootboxActions` and persists lootbox address in `localStorage` (`src/app/lootbox/page.tsx`).
- Admin panel is extensive (flex config, allowlist, VRF, deposits/withdrawals) (`src/components/lootbox/AdminTab.tsx`).
- Hook reads multiple contract fields via `useReadContracts`, watches `FlexOpened` events for NFT win toasts (`src/hooks/use-lootbox-contract.ts`).

### Treasury

- Server components `TreasuryBalance`, `TokenHoldings`, `ZoraCoinHoldings` use `cache()` and call internal API routes for prices and balances (`src/components/treasury/*`).
- NFT holdings is client-side, paginates through subgraph with in-memory pagination and infinite scroll (`src/components/treasury/NftHoldings.tsx`).
- Treasury page uses `Suspense` boundaries for balances, tables, and grids (`src/app/treasury/page.tsx`).

### Members

- `/members` list page is server shell with client `MembersList` fetching from `/api/members` and infinite scroll table (`src/app/members/page.tsx`, `src/components/members/MembersList.tsx`).
- Member detail server page resolves ENS and builds OG metadata; client `MemberDetail` loads overview, votes, delegators, and proposals (Builder SDK) (`src/app/members/[address]/page.tsx`, `src/components/members/MemberDetail.tsx`).

### Auctions

- `/auctions` is client page using React Query (`useAllAuctions`) + `PastAuctions` grid with infinite scroll (`src/app/auctions/page.tsx`, `src/components/auctions/PastAuctions.tsx`).
- Home uses `AuctionSpotlight` with wagmi write actions for bidding/settling and stateful timer (`src/components/hero/AuctionSpotlight.tsx`).

### Droposals

- List page uses `fetchDroposals` (subgraph + calldata decoding) and renders `DroposalsGrid` (`src/app/droposals/page.tsx`).
- Detail page pulls proposal data via subgraph, decodes droposal calldata, and optionally resolves deployed token address from execution receipt (`src/app/droposals/[id]/page.tsx`).
- Minting UI lives in `DroposalActionBox` with `useMintDroposal` and protocol rewards (`src/components/droposals/detail/DroposalActionBox.tsx`).

### Propdates

- Feed page uses client `PropdatesFeed` with React Query + infinite scroll (`src/app/propdates/page.tsx`, `src/components/propdates/PropdatesFeed.tsx`).
- Detail page resolves via `getPropdateByTxid` and renders `PropdateDetail` wrapper (`src/app/propdates/[txid]/page.tsx`).

### Blogs

- Blogs list and detail are server pages with client search and markdown rendering (`src/app/blogs/*`).
- Paragraph API is wrapped in `services/blogs.ts` with `unstable_cache` for publication data.

### Live Feed

- `/feed` server page calls `getAllFeedEvents` and uses `LiveFeedView` with client filters, grouping, and infinite scroll (`src/app/feed/page.tsx`, `src/components/feed/LiveFeedView.tsx`).

### Create Coin

- `/create-coin` is a large client form that uploads media, optionally selects video thumbnail, and calls `useCreateCoin` (Zora coin creation) (`src/app/create-coin/page.tsx`).

### Coin Proposal

- `/coin-proposal` uses `CoinProposalWizard` to generate a proposal from a Zora trade call and then reuses proposal preview/submit flow (`src/app/coin-proposal/page.tsx`, `src/components/coin-proposal/CoinProposalWizard.tsx`).

### TV Hooks + Utilities

- `useTVFeed` loads `/api/tv/feed`, optionally injects a priority coin via Zora SDK, normalizes IPFS URLs, and returns fallback items (`src/components/tv/useTVFeed.ts`).
- `useVideoPreloader` uses a global performance tracker to tune preload-ahead/behind, adds `link[rel=preload]` for upcoming videos, and exposes adaptive render buffer (`src/components/tv/useVideoPreloader.ts`).
- Utilities define priority ordering (paired/gnarly/normal), droposal mapping, and IPFS conversions (`src/components/tv/utils.ts`).

### Proposal Transactions

- `ProposalTransactionVisualization` decodes calldata via viem, infers transaction types (ETH, ERC20, ERC721, droposal), and maps into view models (`src/components/proposals/transaction/ProposalTransactionVisualization.tsx`).
- `TransactionVisualization` renders typed details using `TransactionCard` variants and per-type detail components (`src/components/proposals/transaction/TransactionVisualization.tsx`).
- Detail components provide visual flow for send ETH/USDC/tokens/NFTs, droposal previews, custom calldata links, and coin-buy metadata (`src/components/proposals/transaction/*.tsx`).

### API Routes (Deep Dive)

- Member aggregation and OG data: `/api/members`, `/api/members/active`, `/api/member-og-data/[address]` (`src/app/api/members/*`, `src/app/api/member-og-data/[address]/route.ts`).
- ENS resolution with multi-provider cache: `/api/ens` (`src/app/api/ens/route.ts`).
- Proposals list/detail + per-month aggregates: `/api/proposals`, `/api/proposals/[id]`, `/api/proposals/per-month` (`src/app/api/proposals/*`).
- Treasury pricing/performance: `/api/prices`, `/api/eth-price`, `/api/treasury/performance` (`src/app/api/prices/route.ts`, `src/app/api/eth-price/route.ts`, `src/app/api/treasury/performance/route.ts`).
- Coins + droposal helpers: `/api/coins/create`, `/api/coins/gnars-paired`, `/api/supporters` (`src/app/api/coins/*`, `src/app/api/supporters/route.ts`).
- TV feed + RPC proxy: `/api/tv/feed`, `/api/alchemy` (`src/app/api/tv/feed/route.ts`, `src/app/api/alchemy/route.ts`).
- Pinata upload proxy: `/api/pinata/upload` (`src/app/api/pinata/upload/route.ts`).

### Mural + OG Utilities

- `/mural` renders the draggable NFT grid via `MuralBackground` (`src/app/mural/page.tsx`, `src/components/layout/MuralBackground.tsx`).
- Member OG image generation uses `next/og` edge handler and a test page for previewing (`src/app/members/[address]/opengraph-image.tsx`, `src/app/members/[address]/test-og/page.tsx`).
- TV debug page shows feed items with filters for diagnostics (`src/app/debug/tv/page.tsx`).

## Coverage Status

- ✅ All App Router pages and layouts reviewed.
- ✅ All API routes reviewed.
- ✅ Core feature domains and deep-dive flows documented.

## Best-Practice Updates (Jan 2026)

- Home page now uses ISR (`revalidate = 60`) and defers the 3D TV with `next/dynamic` (`src/app/page.tsx`).
- FAQ + Contracts sections moved to server rendering to reduce the home client bundle (`src/app/page.tsx`, `src/components/home/HomeStaticContent.tsx`).
- Proposal pages switched from `force-dynamic` to ISR (`revalidate = 60`) (`src/app/proposals/page.tsx`, `src/app/proposals/[id]/page.tsx`).
- Blogs and Propdates pages now use ISR instead of forced dynamic rendering (`src/app/blogs/*`, `src/app/propdates/*`).
- DAO + proposal service fetchers wrapped with `cache()` for per-request deduping (`src/services/dao.ts`, `src/services/proposals.ts`).
- Live feed page now relies on `revalidate` without `force-dynamic` (`src/app/feed/page.tsx`).
- Live feed grouping now computes sequence numbers once and uses a single mobile listener (`src/components/feed/LiveFeedView.tsx`).
- Members list search uses `useDeferredValue` to reduce filter churn during typing (`src/components/members/MembersList.tsx`).
