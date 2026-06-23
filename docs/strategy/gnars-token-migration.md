# GNARS Token Migration: Zora to Clanker

> Source: Call with Jack Dishman (Clanker) + Vlad Nikolaev (Gnars) + r4to — 2026-03-26
> Status: **PLANNING** — blocked on Clanker SDK docs and Compre intro

## Context

The GNARS creator coin is currently paired with Zora. Problems:

- Token price bleeding due to Zora's underperformance
- Zora SDK limitations and poor communication
- Zora ecosystem instability ("shady moves" per Vlad)

**Decision:** Relaunch the GNARS token on Clanker with a new ERC20 (100B supply), migrate holders, and rebuild content coin infrastructure on the Clanker ecosystem.

## DAO Internal Decisions Required

Before any technical work or external coordination, **the DAO needs to vote on the migration itself**. Gnars is a Builder DAO — proposals go through on-chain voting (~2 day delay, ~5 day voting period, + timelock). Nothing happens without governance approval.

### Decision 1: Approve Token Migration (PROPOSAL REQUIRED)

**What:** DAO vote to officially approve migrating from Zora-paired GNARS to Clanker-based GNARS.

**Must define:**
- Rationale for migration (Zora underperformance, ecosystem risks)
- Commitment to Clanker ecosystem
- Authorization for the team to execute the migration plan

**Why first:** Without this, no one has authority to deploy a new token or move treasury funds. This is the legitimacy layer — everything else is unauthorized until the DAO votes FOR.

### Decision 2: New Token Economics

**What:** Define the new GNARS token parameters.

**Must define:**
- Total supply (100B discussed, but needs DAO approval)
- Distribution split:
  - Migration allocation (what % for existing holders?)
  - Airdrop allocation (what % for contribution-weighted airdrop?)
  - Treasury/vault reserve (up to 90% can be vaulted per Clanker)
  - Team/operations allocation (if any)
- Pairing asset: ETH vs GNARS vs other (Jack suggested ETH for "cold hard cash")
- Fee structure on the Clanker pool

**Trade-off:** More supply in vault = more runway for future growth, but less initial distribution = less holder engagement. Need community input.

### Decision 3: Migration Method & Parameters

**What:** Confirm migration tool and parameters.

**Must define:**
- Migration method: Compre tool (preferred) vs snapshot
- Migration window duration (1 week discussed, but needs agreement)
- Exchange ratio (old GNARS → new GNARS)
- Deadline policy: what happens to unclaimed tokens after window closes?
- Whether to support migration in waves or all-at-once

### Decision 4: Airdrop Criteria

**What:** Define who qualifies for the contribution-weighted airdrop beyond existing holders.

**Must define:**
- Criteria categories: NFT holders, content creators, athletes, builders, community contributors
- Weighting formula (e.g., NFTs held x time + proposals voted + content created)
- Data sources for snapshot (on-chain activity, Skatehive contributions, etc.)
- Minimum threshold to qualify
- Whether to include holders of related tokens (sk hacker, other creator coins)

**From the call:** Jack suggested "weighting contributions to give people skin in the game" and Vlad mentioned potentially aggregating liquidity from other community tokens like sk hacker.

### Decision 5: Existing Zora Content Coins

**What:** What happens to content coins currently paired with GNARS on Zora?

**Options:**
1. Let them stay on Zora (they still work independently)
2. Build aggregation tool: trade Zora creator coins → new GNARS (Vlad's idea from call)
3. Snapshot holders and airdrop equivalent on Clanker
4. Deprecate and start fresh on Clanker

**This is critical** — creators have real value locked in Zora content coins. The decision affects community trust.

### Decision 6: Treasury Operations

**What:** What treasury actions are needed to support the migration?

**Must define:**
- How much ETH/USDC from treasury for initial liquidity on Clanker?
- Does the treasury migrate its Zora coin holdings?
- Who has execution authority? (Currently proposals go through Governor → Treasury timelock)
- Do we need a multisig for faster operational decisions during migration?

### Decision 7: Communication Plan

**What:** How and when to communicate with holders.

**Must define:**
- Timeline: announce → explain → execute → follow-up
- Channels: Farcaster, Telegram, website banner, GM Farcaster (Jack offered)
- Who drafts messaging (Jack offered help with comms)
- FAQ for holders (what to do, what not to do, deadlines)

### Governance Path

```
1. Draft proposal (informal discussion — Telegram, Farcaster)
   ↓
2. Post proposal on-chain (Decisions 1-6 bundled or split)
   ↓
3. Voting delay (~2 days)
   ↓
4. Voting period (~5 days)
   ↓
5. If SUCCEEDED → Queue
   ↓
6. Timelock delay
   ↓
7. Execute — team authorized to proceed
```

**Minimum timeline from proposal to execution: ~2 weeks.**

**Recommendation:** Bundle Decisions 1-3 into a single "Migration Authorization Proposal" that gives the team a mandate. Decisions 4-7 can be refined in parallel and executed under that mandate.

---

## Migration Strategy (3 Phases)

### Phase 1: Pre-Migration (current)

**Goal:** Get DAO approval, research, plan, communicate.

| Task | Owner | Status | Blocker |
|------|-------|--------|---------|
| **DAO governance decisions (see above)** | Vlad + team | **TODO — CRITICAL** | Must pass before Phase 2 |
| Draft migration authorization proposal | Vlad + r4to | TODO | Needs token economics defined |
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

### Step 0: Internal alignment (BEFORE anything external)
1. **Vlad + r4to:** Align on the 7 DAO decisions above — draft answers
2. **Vlad:** Discuss token economics with core team (supply, distribution, pairing asset)
3. **Vlad + r4to:** Draft migration authorization proposal for DAO vote
4. **Team:** Post proposal on-chain → voting → execution (~2 weeks minimum)

### Step 1: Parallel research (while governance runs)
5. **r4to:** Wait for Clanker SDK docs from Jack → research token pairing mechanics
6. **r4to:** Complete detailed per-file audit of what changes (this doc is the start)
7. **Vlad:** Summarize call intentions for Telegram group with Compre
8. **Jack:** Create Telegram group, intro Compre, send SDK method

### Step 2: Post-approval execution
9. **Team:** Define contribution-weighted airdrop criteria
10. **Team:** Create Trello cards for Phase 2 tasks
11. **r4to:** Begin website migration work (only after DAO vote passes)
