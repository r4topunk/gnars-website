# Vercel Quota Strategy

TL;DR: the site exceeds Vercel Hobby quotas because immutable or slow-moving DAO data is re-rendered, re-fetched and re-cached as if it were live. The fix is matching cache lifetime to the **real update cadence of each data type**, slimming RSC payloads, and shielding origin from bot traffic. This doc is the playbook; keep it current as fixes land.

## Quota status (billing window Jun 3 – Jul 3, 2026)

| Quota                | Used / Limit      | Primary drivers                                                                     |
| -------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| ISR Writes           | 620K / 200K units | `/proposals` list payload, 300s revalidate everywhere, ×2 locales, ×3 cache entries |
| Fluid Active CPU     | 11h22 / 4h        | `/members/[address]` (force-dynamic + bot crawl), home, `/api/tv/feed`, RPC fan-out |
| Fast Origin Transfer | 12.4GB / 10GB     | Same pages: big RSC payloads leaving compute on every render/regen                  |

Bot traffic (Googlebot, OpenAI, Baiduspider — ~12–14K req/12h each) hits mostly-unique paths, so per-path caches don't amortize; every crawl of an expired path is a full render + ISR write.

## Billing mechanics (measured on this project)

- ISR writes are billed in **units per cache entry** (~8KB granularity). One page revalidation in Next 16 writes **~3 entries** (page + `_full.segment` + `__PAGE__.segment`), and `[locale]` doubles everything → one route at `revalidate = 300` costs up to `12/h × 3 × 2 = 72` write units/hour **per KB-bucket of payload**. `/en/proposals` alone measured ~70 units _per write_ before slimming (1.3MB embedded JSON).
- Writes are traffic-triggered (revalidate-on-request after expiry). No traffic → no writes. Bots count as traffic.
- `react.cache()` dedupes **within one render pass only**. It does not persist across revalidations or across routes. Only `unstable_cache` / fetch `next.revalidate` hit the shared data cache.
- `export const dynamic = "force-dynamic"` **overrides** `export const revalidate` on the same route (see the sitemap bug below).

## Data type × real cadence → correct strategy

The core principle: **DAO data is mostly append-only and terminal.** Once a proposal is Executed/Defeated/Cancelled/Vetoed/Expired, an auction settled, a round closed, a droposal executed — that record never changes again. Only a small live window (active auction, proposals in their 4-day voting window, prices, feed) needs freshness.

| Data                              | Real cadence                                                             | Current handling                                                         | Target                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Base proposals (list)             | new ~weekly; votes change during 4-day window; terminal states immutable | subgraph `no-store` + 123 RPC `state()` reads per invocation, route 300s | `unstable_cache` 900–1800s; **skip `state()` RPC for terminal proposals** (subgraph already has `executed/canceled/vetoed/queued` booleans) |
| Proposal detail pages             | immutable once finalized                                                 | revalidate 300 for all                                                   | status-aware: short TTL only for Active/Pending; long/static for finalized                                                                  |
| Ethereum-era + Snapshot proposals | **immutable** (static JSON)                                              | re-processed every 300s via consumers                                    | static import / `revalidate = false`; `generateStaticParams`                                                                                |
| Settled auctions                  | immutable; +1/day                                                        | `no-store` subgraph                                                      | `unstable_cache` 3600+                                                                                                                      |
| Treasury balances                 | change on tx (slow); prices per-minute                                   | fetch 60s on balances                                                    | balances 300–900s; prices already CDN-cached (fine)                                                                                         |
| Feed events                       | event-driven                                                             | `unstable_cache` **15s** under a 300s route                              | align to 120–300s                                                                                                                           |
| Members                           | holdings ~daily                                                          | `/members/[address]` force-dynamic (see trap below)                      | keep dynamic; cache the data lookups (`unstable_cache`)                                                                                     |
| Blogs                             | editorial                                                                | data cached 3600s but route 300s                                         | route revalidate 3600 to match                                                                                                              |
| Installations                     | static JSON                                                              | `[slug]` 300s                                                            | 3600+/static                                                                                                                                |
| Rounds (Postgres)                 | live while open; closed = immutable                                      | raw `pg` on every call, no cache                                         | `unstable_cache` 120–300s for listings; closed rounds static                                                                                |
| TV/coins feed                     | hourly aggregation                                                       | CDN s-maxage 3600 (ok), but 2s CPU per cold miss                         | cap upstream fan-out, persist HEAD-probe cache                                                                                              |

## Traps (learned the hard way — do not repeat)

1. **Do NOT convert `/members/[address]` to ISR.** Hundreds of unique addresses are in the sitemap ×2 locales; bots crawl each path once. ISR would write ~3 cache entries per unique path per crawl (~5K+ units/day) into the _tightest_ quota. Correct approach: stay `force-dynamic`, cache the expensive lookups (Zora profile + overview via `unstable_cache`, done in PR #127) — or remove member pages from the sitemap.
2. **`force-dynamic` + `revalidate` on the same route = fully dynamic.** The sitemap has both; every crawler hit re-runs the full fan-out (all proposals + coins + members + blogs + droposals).
3. **Slimming beats TTL-raising.** PR #120 raised TTLs (60→300) and barely moved the needle; PR #127 cut the payload 68% — write units scale with payload size × entry count, not just frequency.
4. **`src/lib/subgraph.ts` hardcodes `cache: "no-store"`** — every caller re-fetches origin on every regen regardless of route TTL.

## Fix backlog (impact ÷ effort, merged from route sweep + data-cadence audit)

| #   | Fix                                                                                                                                                                                              | Quota hit    | Status           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ---------------- |
| 1   | Slim `/proposals` + home payloads (`toListProposal`)                                                                                                                                             | ISR + FOT    | ✅ PR #127       |
| 2   | Cache member OG metadata (`unstable_cache` 30min)                                                                                                                                                | CPU          | ✅ PR #127       |
| 3   | Sitemap: remove `force-dynamic` (one line)                                                                                                                                                       | CPU + FOT    | todo             |
| 4   | Skip `governor.state()` RPC for terminal proposals; `listMultiChainProposals` fetches 1000 → fetch what's needed                                                                                 | CPU          | todo             |
| 5   | Status-aware revalidate on `/proposals/[chain]/[id]`                                                                                                                                             | ISR          | todo             |
| 6   | `images.minimumCacheTTL: 2592000` (banners/media are immutable)                                                                                                                                  | FOT + CPU    | todo             |
| 7   | Batch-add `Cache-Control: public, s-maxage, stale-while-revalidate` to API GETs without it (`md/*`, `api/proposals/per-month`, `api/members`, `api/coins/gnars-paired`, `api/poidh/bounties`, …) | CPU + FOT    | todo             |
| 8   | `/api/alchemy`: 9.9% error rate — only `eth_getBalance` has RPC fallback; add fallback/retry + micro-cache for read methods                                                                      | CPU + errors | todo             |
| 9   | Immutable content → static (`Snapshot`/ETH-era proposals, installations `[slug]`, executed droposals, closed rounds)                                                                             | ISR          | todo             |
| 10  | Align `/blogs` route TTL to data TTL (300 → 3600)                                                                                                                                                | ISR          | todo             |
| 11  | Replace `no-store` in `subgraph.ts` with per-caller `next.revalidate`                                                                                                                            | CPU + FOT    | todo             |
| 12  | Bot mitigation: tighten robots.txt (Baiduspider/AI crawlers), reconsider member URLs in sitemap                                                                                                  | all          | decide with team |

## How to verify (after each deploy)

Vercel dashboard → project `gnars-shadcn` → Observability:

- **ISR** tab, sort by _Total Written_, view in **Units** (that's what's billed). Expect `/en/proposals` ~70 → ~10 units/write after #127.
- **Functions** tab, sort by _Active CPU_: `/[locale]/members/[address]` and `/api/tv/feed` are the benchmarks.
- **Fast Data Transfer** tab for payload regressions.

The account-level Usage page charts frequently fail to load; per-project Observability is the reliable path. Give changes 24–48h in the 30-day rolling window before judging.
