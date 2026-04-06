# GNARS Token Migration: Zora to Clanker

> Source: Call with Jack Dishman (Clanker) + Vlad Nikolaev (Gnars) + r4to — 2026-03-26
> Status: **PLANNING** — blocked on Clanker SDK docs and Compre intro

## Context

The GNARS creator coin is currently paired with Zora. Problems:

- Token price bleeding due to Zora's underperformance
- Zora SDK limitations and poor communication
- Zora ecosystem instability ("shady moves" per Vlad)

**Decision:** Relaunch the GNARS token on Clanker with a new ERC20 (100B supply), migrate holders, and rebuild content coin infrastructure on the Clanker ecosystem.

## Migration Strategy (3 Phases)

### Phase 1: Pre-Migration (current)

**Goal:** Research, plan, communicate.

| Task | Owner | Status | Blocker |
|------|-------|--------|---------|
| Receive Clanker SDK method for custom pairing | Jack Dishman | WAITING | - |
| Intro with Compreny/Kabrini (migration tool) | Jack Dishman | WAITING | - |
| Research Clanker SDK and token pairing mechanics | r4to | TODO | SDK docs needed |
| Audit all Zora-dependent code in gnars-website | r4to | IN PROGRESS | - |
| Define contribution-weighted airdrop criteria | Vlad + team | TODO | - |
| Draft holder communication (pre-migration) | Vlad + Jack | TODO | - |
| Create Trello cards for execution | team | TODO | - |

### Phase 2: Migration

**Goal:** Deploy new token, run migration tool, airdrop.

1. Deploy new GNARS token on Clanker (100B supply)
2. Open migration window via Compre tool (holders deposit old tokens → receive new tokens)
3. Run contribution-weighted airdrop to active creators/contributors
4. Close migration window after ~1 week

**Key decisions made:**
- Use Compre migration tool (NOT snapshot) — clearer communication, no one "caught off guard"
- Single strong token launch — no multiple creator tokens splitting attention
- GNARS token must be live first before custom pairing works on Clanker
- Future tokens may pair with ETH instead of GNARS ("cold hard cash" for creators)

### Phase 3: Post-Migration (Website Rebuild)

**Goal:** Replace all Zora integrations with Clanker equivalents.

- Swap Zora SDK for Clanker SDK across all hooks/components
- Deploy new subgraph for Clanker-paired coins
- Update content coin creation flow
- Update trading/swap mechanics
- Update treasury display
- Update proposal builder (buy-coin transaction type)

## Codebase Impact Audit

### Critical (63 files reference Zora)

**Core Config:**
- `src/lib/config.ts` — GNARS creator coin address, Zora handles, factory address, referrer
- `src/lib/zora-coins-subgraph.ts` — subgraph client for GNARS-paired coins
- `src/lib/zora/poolConfig.ts` — Uniswap V4 pool config for content coins
- `src/lib/zora/factoryAbi.ts` — Zora factory ABI
- `src/lib/zora-helpers.ts` — utility functions

**Hooks (business logic):**
- `src/hooks/useCreateCoin.ts` — creates content coins via Zora SDK
- `src/hooks/use-trade-creator-coin.ts` — buy creator coins via Zora SDK
- `src/hooks/use-batch-coin-purchase.ts` — batch buy via Multicall3
- `src/hooks/use-zora-profile.ts` — resolve Zora profiles
- `src/hooks/use-profile-coins.ts` — fetch profile coin data

**Pages:**
- `src/app/create-coin/page.tsx` — create content coins
- `src/app/coin-proposal/page.tsx` — propose DAO coin purchases
- `src/app/tv/[coinAddress]/page.tsx` — individual coin view
- `src/app/treasury/page.tsx` — treasury with Zora holdings

**Components:**
- `src/components/tv/GnarsTVFeed.tsx` — TV feed (creator coins)
- `src/components/tv/BuyAllModal.tsx` — bulk purchase UI
- `src/components/tv/TVVideoCardInfo.tsx` — coin info display
- `src/components/treasury/ZoraCoinHoldings.tsx` — treasury Zora holdings
- `src/components/treasury/ZoraCoinHoldingsClient.tsx` — client-side holdings
- `src/components/coin-proposal/CoinProposalWizard.tsx` — proposal wizard
- `src/components/coin-proposal/CoinPurchaseForm.tsx` — purchase form
- `src/components/members/ZoraProfileSummary.tsx` — member Zora profile
- `src/components/members/detail/MemberCreatedCoinsGrid.tsx` — member coins
- `src/components/proposals/builder/forms/buy-coin-form.tsx` — proposal form
- `src/components/proposals/transaction/BuyCoinTransactionDetails.tsx` — tx display

**API Routes:**
- `src/app/api/coins/gnars-paired/route.ts` — fetch GNARS-paired coins
- `src/app/api/coins/create/route.ts` — coin creation API
- `src/app/api/tv/feed/route.ts` — TV feed data

**Subgraph:**
- `subgraphs/zora-coins/` — indexes GNARS-paired coins from Uniswap V4

**Dependencies:**
- `@zoralabs/coins-sdk` — primary SDK for all coin operations

### Not Affected
- Auction system (Builder DAO, independent of Zora coins)
- Governance/voting (Builder Governor)
- NFT minting (droposals use separate Zora NFT contracts, different concern)
- Lootbox (independent contract)
- Blog/static content

## External Dependencies & Contacts

| Who | Role | Action Item |
|-----|------|-------------|
| Jack Dishman | Clanker team | SDK docs, Compre intro, comms help, GM Farcaster feature |
| Compreny/Kabrini | Migration tool builder | Provide migration tool (like Space token on Nouns) |
| Caniana | Clanker project (Spain) | Potential partner — Jack offering intro |
| Kenny (Picture/poidh) | Bounty provider | Already integrated |

## Clanker Ecosystem Benefits (from call)

- Tokens are independent, self-sustainable, immutable after deploy
- Protocol fees fund an ecosystem fund for projects like Gnars
- Marketing/distribution via GM Farcaster (branded X account)
- Custom fee structures (can take fees in paired token, USDC, or ETH)
- Vault up to 90% supply for rewards, onboarding, airdrops

## Open Questions

1. What's the Clanker SDK equivalent of `@zoralabs/coins-sdk`?
2. How does custom pairing work? (Jack promised SDK method)
3. What's the timeline for the migration tool from Compre?
4. How to handle the existing Zora subgraph data post-migration?
5. Do droposals (NFT mints) need to change? (They use separate Zora NFT contracts)
6. What happens to existing content coins paired with GNARS on Zora?
7. How to handle the transition period (both systems live)?
8. Pair new tokens with ETH or GNARS? (Jack suggested ETH for "cold hard cash")

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration tool delay (Compre) | HIGH — blocks everything | Start research in parallel; have snapshot as fallback |
| Holders miss migration window | HIGH — community trust | Clear comms, long window (~1 week+), multiple channels |
| Clanker SDK gaps vs Zora SDK | MEDIUM — feature regression | Research early, identify gaps before committing |
| Content coins stranded on Zora | MEDIUM — value locked | Consider aggregation tool (trade Zora coins → GNARS) |
| Attention split during transition | MEDIUM — price impact | Single strong launch per Jack's advice |

## Next Steps (Immediate)

1. **r4to:** Wait for Clanker SDK docs from Jack → research token pairing mechanics
2. **r4to:** Complete detailed per-file audit of what changes (this doc is the start)
3. **Vlad:** Summarize call intentions for Telegram group with Compre
4. **Jack:** Create Telegram group, intro Compre, send SDK method
5. **Team:** Define contribution-weighted airdrop criteria
6. **Team:** Create Trello cards for Phase 1 tasks
