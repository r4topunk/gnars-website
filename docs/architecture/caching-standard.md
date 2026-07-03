# Next.js Caching & Freshness Standard

TL;DR: today freshness comes from short TTLs (polling model): every page re-renders every 300s whether data changed or not — which simultaneously blows Vercel quotas AND still feels slow (a vote takes 5–10min to reach other users). The standard below inverts the model: **long/idle caches everywhere + event-driven invalidation when a mutation happens**. Quota mechanics live in `vercel-quota-strategy.md`; this doc is the policy for route params, cache tags and mutation wiring.

## Why actions propagate slowly today (measured path of a vote)

The voter sees their vote instantly (optimistic local state in `ProposalDetail.tsx`). Everyone else waits through four stacked layers:

| #   | Layer                                | Delay                                                                | Notes                                                                                                         |
| --- | ------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Goldsky subgraph indexing            | seconds–~1min (UNKNOWN: measure)                                     | tx is onchain but not yet queryable                                                                           |
| 2   | ISR route cache (`revalidate = 300`) | up to 300s, **+1 visit**                                             | stale-while-revalidate: the first visitor after expiry still gets the stale page; regen happens in background |
| 3   | Client router segment cache          | up to ~5min                                                          | Next 16 segment cache on pages the user already visited                                                       |
| 4   | React Query defaults                 | `staleTime` 5min, `refetchOnWindowFocus: false` (`Providers.tsx:28`) | client-fetched data (votes list, feeds)                                                                       |

Worst case ≈ 10min. Nothing in the repo calls `revalidateTag`/`revalidatePath` — **zero event-driven invalidation exists**. Same for proposal creation: it appears on `/proposals` only after layers 1+2+3 elapse.

## The standard

### Rule 1 — route segment config decision tree

```
Is the response per-user or uncacheable (cookies/headers/POST)?
├─ yes → force-dynamic, but every expensive lookup inside goes through
│        unstable_cache (pattern: /members/[address], PR #127)
└─ no → Is the data immutable (terminal proposal, closed round, static JSON)?
    ├─ yes → generateStaticParams + long revalidate (86400) or fully static
    └─ no → Is the route hit mostly on unique paths by bots (profile-like)?
        ├─ yes → dynamic + Cache-Control: public, s-maxage, SWR (zero ISR writes)
        └─ no → ISR with LONG revalidate (1800–3600) + tagged data reads
                (freshness comes from revalidateTag, not from the TTL)
```

Never combine `force-dynamic` with `revalidate` (force-dynamic silently wins — the sitemap bug).

### Rule 2 — every service read is tagged

All reads in `src/services/*` go through `unstable_cache` with canonical tags. TTL is a _backstop_, not the freshness mechanism.

| Tag                       | Covers                         | Backstop TTL               |
| ------------------------- | ------------------------------ | -------------------------- |
| `proposals`               | proposal lists (all consumers) | 1800                       |
| `proposal:<number>`       | one proposal detail + votes    | 1800 (Active/Pending: 120) |
| `auction`                 | current auction state          | 60                         |
| `auctions`                | settled auction history        | 3600                       |
| `feed`                    | activity feed events           | 300                        |
| `members`                 | holders list, overviews        | 3600                       |
| `treasury`                | balances                       | 900                        |
| `propdates`               | EAS attestations               | 300                        |
| `rounds` / `round:<slug>` | rounds listings / one round    | 300 / closed: 86400        |

### Rule 3 — mutations invalidate, clients don't poll

After a write-hook confirms a receipt it must:

1. `queryClient.invalidateQueries(...)` for the local view (pattern already exists in `AuctionBidForm` / `AuctionSettleButton` — votes and propose are missing it).
2. `POST /api/revalidate { tags: [...] }` (new route, tag-allowlist, light rate limit) so **other users'** server caches drop. Because of subgraph lag, fire it after polling the subgraph for the event (bounded ~30–45s), with a fallback second call at +60s.

| Mutation (hook)         | Tags to invalidate                        |
| ----------------------- | ----------------------------------------- |
| `useCastVote`           | `proposal:<n>`, `proposals`, `feed`       |
| propose (wizard submit) | `proposals`, `feed`                       |
| bid                     | `auction`, `feed`                         |
| settle                  | `auction`, `auctions`, `feed`, `treasury` |
| propdate post           | `propdates`, `proposal:<n>`               |
| delegate                | `members`                                 |
| round vote/submit       | `round:<slug>`, `rounds`                  |

### Rule 4 — prefetch discipline

Grids with >20 `<Link>`s (`ProposalCard`, members list, auctions) set `prefetch={false}`. Each card in viewport otherwise prefetches the detail page's segments — ISR writes with no pageview, multiplied by bots.

### Rule 5 — client defaults per data class

Keep the global React Query `staleTime: 5min`. Live views override per-query: current auction `refetchInterval` while open, active-proposal votes `staleTime ≤ 60s`. Never lower the global default to fix a single stale view.

### Rule 6 — images

`images.minimumCacheTTL: 2592000` (proposal banners / Zora media are immutable IPFS content) and replace `hostname: "**"` with an allowlist when feasible.

## Current state vs target (route params)

| Route                                     | Today                                     | Target                                                                 |
| ----------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| `/proposals`                              | revalidate 300                            | 1800 + `proposals` tag                                                 |
| `/proposals/[chain]/[id]`                 | 300 for all                               | 120 Active/Pending, 86400 terminal (status-aware) + `proposal:<n>` tag |
| `/proposals/snapshot`                     | 300                                       | static (immutable JSON)                                                |
| `/` (home)                                | 300                                       | 900 + tags (`proposals`, `auction`, `feed`)                            |
| `/members/[address]`                      | force-dynamic ✅                          | keep; cached lookups (done PR #127)                                    |
| `/members`                                | 3600 ✅                                   | + `members` tag                                                        |
| `/feed`                                   | 300 (inner cache 15s!)                    | 300 route + inner cache aligned 300 + `feed` tag                       |
| `/blogs`, `/blogs/[slug]`                 | 300                                       | 3600 (match data cache)                                                |
| `/installations/[slug]`                   | 300                                       | 3600/static                                                            |
| `/rounds*`                                | 300, raw pg                               | tagged `unstable_cache`; closed rounds 86400                           |
| `/droposals*`                             | 1800 ✅                                   | executed → static                                                      |
| `sitemap.xml`                             | revalidate 3600 **+ force-dynamic (bug)** | drop force-dynamic                                                     |
| `/tv`, `/treasury`, `/community/bounties` | 300                                       | 900–1800 (client components already handle live parts)                 |

## Rollout (round 3, ordered so freshness improves first)

1. **P1 — event-driven freshness** (closes the user complaint): `/api/revalidate` route + tags on `services/proposals.ts` + wire `useCastVote` and the propose wizard (invalidateQueries + revalidate call with subgraph-sync poll). After this, a vote/proposal reaches everyone in ~subgraph-lag seconds instead of ~10min — while TTLs get LONGER, not shorter.
2. **P2 — param standardization**: table above (sitemap one-liner, status-aware proposal detail, blogs/installations TTLs, prefetch discipline, minimumCacheTTL).
3. **P3 — plumbing**: replace `no-store` in `lib/subgraph.ts` with per-caller tagged caches; terminal-state RPC skip; static immutable pages.

UNKNOWN: real Goldsky indexing lag distribution (instrument the revalidate endpoint and log tx→queryable delta); whether `revalidateTag` frequency has practical limits on Hobby (docs: on-demand writes bill only changed bytes — cheap).
