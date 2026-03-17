---
name: API patterns and caching strategies
description: Observed caching patterns, route conventions, and data fetching strategies across src/app/api/ and src/services/
type: project
---

Key patterns observed in the codebase as of 2026-03-16.

**Why:** Capture conventions so future agents can follow established patterns consistently and avoid contradictions.
**How to apply:** Use these as the canonical reference before creating or modifying API routes and services.

## Caching layers (in order of lookup)

1. `react.cache()` — per-request deduplication (used in `proposals.ts`, `farcaster-tv-aggregator.ts`)
2. In-memory LRU / `Map` — across warm serverless invocations; used in `ens/route.ts`, `supporters/route.ts`, `treasury/performance/route.ts`, `farcaster-tv-aggregator.ts`
3. `unstable_cache` with tags — cross-request server cache; used in `members/route.ts` (tag: "members"), `farcaster.ts` (tag: "farcaster-profiles"), `farcaster-tv-aggregator.ts` (tag: "farcaster-tv-aggregator")
4. `fetch` with `next: { revalidate }` — Next.js HTTP-level cache on specific upstram requests

## Subgraph access

- All subgraph queries go through `src/lib/subgraph.ts::subgraphQuery<TData>()`.
- Uses `cache: "no-store"` globally — every call is a fresh fetch. Caching is applied at service or route level, not here.
- Subgraph URL comes from `SUBGRAPH.url` in `src/lib/config.ts`. Always lowercase addresses in filters.

## Route conventions

- Use `NextRequest`/`NextResponse` (not plain `Request`/`Response`) unless it's a simple POST.
- Validate path params with regex or Zod; `delegators/[address]/route.ts` is the reference for address validation.
- Error format: `{ error: string }` with appropriate HTTP status (400, 404, 500).
- Set `Cache-Control: public, s-maxage=N, stale-while-revalidate=M` headers on responses that should be edge-cached.

## Conflict: `force-dynamic` + `revalidate`

Several routes export both `export const dynamic = "force-dynamic"` and `export const revalidate = N`.
These are contradictory — `force-dynamic` disables ISR. Affected files:
- `proposals/route.ts` (lines 4-5)
- `proposals/[id]/route.ts` (lines 5-6)
- `proposals/per-month/route.ts` (lines 5-6)
- `supporters/route.ts` (lines 7-8)

## Parallelism pattern

`Promise.all` is used in `members/route.ts` to fan out 5 independent subgraph queries concurrently.
Waterfall patterns exist in `treasury/performance/route.ts` (sequential per-month block resolution — intentional for rate limiting).
`runWithConcurrency` helper is duplicated in `tv/feed/route.ts` and `farcaster-tv-aggregator.ts`.

## Known heavy endpoints

- `GET /api/members` — fetches all members, 5 parallel subgraph queries, ~300ms–2s. Cached via `unstable_cache` with 5-min TTL.
- `GET /api/tv/feed` — fans out to Zora API + Farcaster + subgraph; s-maxage=3600 set on response.
- `GET /api/treasury/performance` — sequential Basescan + RPC calls per month; no HTTP caching header set on final response; in-process Map cache only.
- `GET /api/supporters` — calls `ownerOf` per token ID in a for-loop (no multicall); in-memory cache 5 min.
