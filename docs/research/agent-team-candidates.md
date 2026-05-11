# Research — Agent Team Task Candidates

## Goal

Identify medium-sized tasks that span 2–3 independent work streams, suitable for a small agent team working in parallel. Focus on tasks with visible user value that can be completed in one session.

## Existing Patterns (Reference)

- Server Component + Client Component split: `src/components/treasury/TreasuryBalance.tsx` (SC fetches, passes data to `TreasuryBalanceClient.tsx`)
- Subgraph data in SC via `react.cache`: `src/components/treasury/TokenHoldings.tsx`, `ZoraCoinHoldings.tsx`
- Client Component doing direct subgraph fetch (anti-pattern): `src/components/treasury/NftHoldings.tsx`
- Loading skeletons defined alongside components: `src/components/proposals/ProposalsGrid.tsx` exports `ProposalsGridSkeleton`
- Metadata via layout files when shared: `src/app/auctions/layout.tsx`, `src/app/proposals/layout.tsx`
- Metadata directly in page file when unique: `src/app/about/page.tsx`, `src/app/proposals/page.tsx`

---

## Candidate 1 — SEO completeness: metadata + OG images for missing pages

### Description

7 pages are missing `export const metadata` and some also lack `opengraph-image.tsx`. Missing pages: `treasury`, `members`, `feed`, `lootbox`, `tv` (root), `mural`, `propose`.

**Missing metadata only** (no OG image either): `treasury/page.tsx`, `members/page.tsx`, `feed/page.tsx`, `lootbox/page.tsx`, `mural/page.tsx`, `propose/page.tsx`

**Missing OG image** (has TV layout metadata but no page-level image): `tv/page.tsx`

Confirmed by checking:

- Metadata: all 7 pages have no `export const metadata` or `generateMetadata`
- OG images: `members/`, `feed/`, `lootbox/`, `mural/`, `propose/` have no `opengraph-image.tsx`; `treasury/` has one; `tv/` has one via layout

### Files Involved

- `src/app/treasury/page.tsx` — add metadata only (OG exists at `opengraph-image.tsx`)
- `src/app/members/page.tsx` — add metadata + create `opengraph-image.tsx`
- `src/app/feed/page.tsx` — add metadata + create `opengraph-image.tsx`
- `src/app/lootbox/page.tsx` — add metadata + create `opengraph-image.tsx`
- `src/app/mural/page.tsx` — add metadata + create `opengraph-image.tsx`
- `src/app/propose/page.tsx` — add metadata + create `opengraph-image.tsx`
- Reference pattern: `src/app/treasury/opengraph-image.tsx`, `src/app/droposals/[id]/opengraph-image.tsx`

### Agent Split

- **Agent A**: Metadata exports for all 6 pages (pure text, no dependencies between pages)
- **Agent B**: OG image components for `members`, `feed`, `lootbox` (static layout using Next.js ImageResponse)
- **Agent C**: OG image components for `mural`, `propose` + update `docs/INDEX.md` and sitemap if needed

### Why Good for Agent Team

- No cross-file dependencies between the 6 pages
- Each agent works on orthogonal files
- All 3 agents can start simultaneously
- Low risk of merge conflict
- Clear success criterion: running `pnpm build` with no metadata warnings

---

## Candidate 2 — `send-tokens` transaction: fetch ERC-20 decimals on-chain

### Description

The `send-tokens` transaction type in the proposal builder uses a hardcoded `18` decimal assumption. There is an explicit `TODO` comment at `src/lib/proposal-utils.ts:42`:

```
// TODO: Fetch token decimals on-chain or add a field to the form
args: [tx.recipient, parseUnits(tx.amount || "0", 18)], // Assuming 18 decimals for generic ERC-20
```

This can silently produce wrong calldata if a proposer sends a 6-decimal token (e.g., USDC via the generic path instead of the dedicated USDC form). The fix spans 3 layers:

1. **Hook**: a `useReadContract` call to `decimals()` on the token contract address (triggered when address is filled in the form)
2. **Form** (`SendTokensForm`): display the fetched decimals as a hint and pass them down; or add a manual override field as fallback
3. **Encoding** (`proposal-utils.ts`): accept `decimals` as a parameter in `encodeTransactions` for the `send-tokens` case

### Files Involved

- `src/components/proposals/builder/forms/send-tokens-form.tsx` — UI for token address, recipient, amount
- `src/lib/proposal-utils.ts:39–57` — encoding logic with the TODO
- `src/components/proposals/schema.ts` — Zod schema may need a `decimals` field added
- `src/components/proposals/builder/ActionForms.tsx` — orchestrates form submit and encoding
- `src/components/proposals/transaction/SendTokensTransactionDetails.tsx` — preview display

### Agent Split

- **Agent A**: Add `decimals` field to Zod schema + `SendTokensForm` UI (fetch via `useReadContract`, show fetched value, allow manual override)
- **Agent B**: Update `encodeTransactions` in `proposal-utils.ts` to accept and use `decimals` for the `send-tokens` case; update `SendTokensTransactionDetails` preview
- **Agent C**: Write unit tests for the encoding with various decimal values (6, 8, 18)

### Why Good for Agent Team

- Agent A (form/UI) and Agent B (encoding) touch different files with a well-defined interface: `decimals: number` passed through
- The schema change is the integration point; Agent A owns it, Agent B reads it
- Real user impact: wrong decimals = proposal sends 10^12x the intended amount of a 6-decimal token
- Self-contained enough to ship in one PR

---

## Candidate 3 — `NftHoldings`: migrate from client-side subgraph fetch to Server Component pattern

### Description

`src/components/treasury/NftHoldings.tsx` is a `"use client"` component that runs the subgraph query entirely in the browser using `useEffect` + `useState`. The rest of the treasury page uses the established Server Component pattern (SC fetches, passes data to a client display component).

Inconsistency confirmed: `TokenHoldings.tsx` and `ZoraCoinHoldings.tsx` use `react.cache` + server fetch. `NftHoldings.tsx` does not — it directly calls `subgraphQuery` from a client context.

This task involves:

1. Extract data-fetching logic into a server-side function (or service in `src/services/`)
2. Create `NftHoldingsClient.tsx` for the display/infinite scroll UI (using the same IntersectionObserver pattern already in the file)
3. Update `NftHoldings.tsx` to be the server wrapper that fetches the first page and passes it as props

The infinite scroll pagination currently fetches more pages client-side; the first page can be SSR'd to improve time-to-first-meaningful-paint on the Treasury page.

### Files Involved

- `src/components/treasury/NftHoldings.tsx` — full rewrite: server wrapper + extract client piece
- `src/components/treasury/NftHoldingsClient.tsx` — new file (follows `TokenHoldingsClient.tsx` pattern)
- `src/services/dao.ts` or new `src/services/treasury-nfts.ts` — server-side subgraph query function
- `src/app/treasury/page.tsx` — no changes needed (already wraps NftHoldings in Suspense)
- Reference: `src/components/treasury/TokenHoldings.tsx` + `TokenHoldingsClient.tsx`

### Agent Split

- **Agent A**: Write the server-side query function in services + the `NftHoldings.tsx` server wrapper
- **Agent B**: Write `NftHoldingsClient.tsx` — extract the display + pagination logic from the current client component
- **Agent C**: Verify the data types align between A and B, add TypeScript interfaces, update docs

### Why Good for Agent Team

- Agent A and B work on different files; the shared interface is the `Token[]` props type
- Follows an established pattern already in the codebase — low creative surface, high correctness demand
- No new dependencies, no schema changes
- Direct performance improvement: treasury NFT grid renders SSR'd on first load

---

## Candidate 4 — Members page: enable search + add metadata/OG image

### Description

The `MembersList` component has a built-in search feature but the members page passes `showSearch={false}`, disabling it. The search input renders as disabled during loading and hidden after. The client-side filtering is already implemented in `filteredMembers` (lines 97–127 of `MembersList.tsx`). There is no obvious reason the search is hidden on the `/members` page — the `showSearch` prop appears to have been added to support embedding the list elsewhere without the search bar.

Additionally, `/members/page.tsx` has no `metadata` export.

This task spans:

1. Enable search on the members page (`showSearch={true}` or remove the prop default)
2. Add `export const metadata` to `src/app/members/page.tsx`
3. Create `src/app/members/opengraph-image.tsx`
4. Optionally: add ENS name search to `filteredMembers` (the API already supports a `search` query param but it is not used from the component)

### Files Involved

- `src/app/members/page.tsx` — change `showSearch` prop, add metadata
- `src/components/members/MembersList.tsx` — possibly enable ENS-aware server search
- `src/app/members/opengraph-image.tsx` — create new
- `src/app/api/members/route.ts` — already accepts `search` query param

### Agent Split

- **Agent A**: Enable search (remove `showSearch={false}`, confirm behavior), add metadata to page
- **Agent B**: Create `opengraph-image.tsx` for members page
- **Agent C**: Wire ENS name display into the search filter (members have raw addresses; ENS names aren't in the list data unless fetched)

Note: Agent C depends on confirming what data `MemberListItem` contains. This may be too speculative without reading the members API response shape.

### Why Good for Agent Team

- Agents A and B are fully independent
- Immediate visible value: search on a table of 100+ members is a usability win
- Low risk: `showSearch` prop change is a 1-line diff

---

## Findings Summary

| #   | Task                               | Visible Impact                          | Files Changed | Parallelism               |
| --- | ---------------------------------- | --------------------------------------- | ------------- | ------------------------- |
| 1   | SEO metadata + OG images (7 pages) | Medium — social sharing                 | ~14 files     | High (no deps)            |
| 2   | `send-tokens` decimals fix         | High — prevents wrong proposal calldata | 5 files       | Medium (shared interface) |
| 3   | `NftHoldings` SC migration         | Medium — treasury page TTI              | 4 files       | High (shared type)        |
| 4   | Members search + metadata          | Medium — UX + SEO                       | 3 files       | High                      |

## Recommendation

**Top pick for agent team: Candidate 2 (send-tokens decimals fix)**

Rationale:

- The TODO has a clear correctness risk, not just aesthetics
- The 3-agent split maps cleanly to 3 orthogonal concerns (form UI, encoding logic, tests)
- The interface between agents is a single `decimals: number` field — low coordination overhead
- Produces visible user value: proposers see the token's actual decimals in the form and the encoded calldata is correct

**Second pick: Candidate 1 (SEO metadata + OG images)**

Rationale:

- Pure parallelism — 3 agents working on completely independent pages
- Zero risk to existing functionality
- Straightforward completion criterion

## Risks / Constraints

- Candidate 2: `useReadContract` introduces an RPC call on every token address change in the form; needs debounce
- Candidate 2: token contract may not implement `decimals()` (non-standard ERC-20); needs a fallback
- Candidate 3: the current client-side pagination loads pages 2+ lazily; after migration, only page 1 is SSR'd and subsequent pages still need a client fetch mechanism
- Candidate 4: ENS-aware search would require re-fetching from the API on every keystroke; the current client-side filter on raw addresses is instant but misses ENS names

## Open Questions

1. Why was `showSearch={false}` chosen for `/members`? Was it a deliberate UX decision or left incomplete?
2. For Candidate 3: does the treasury NFT list need to support pagination beyond the first page in an SSR context, or is 20 items sufficient for the initial render?
3. For Candidate 2: should `decimals` be fetched silently and shown as informational, or should a mismatch block form submission?
