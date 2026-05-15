# Research — Next.js Build Configuration & Bundle Optimization Audit

## Goal

Identify concrete, actionable opportunities to reduce bundle size, improve build configuration, and enforce correct Server/Client Component boundaries in the Gnars DAO website. Success means a prioritized list of changes with file-level specificity.

---

## Existing Patterns

- `next.config.ts` — build config with image patterns, redirects, server actions
- `tsconfig.json` — compiler options
- `package.json` — full dependency list
- `src/app/globals.css` — Tailwind v4 import
- `postcss.config.mjs` — PostCSS with Tailwind plugin
- `src/middleware.ts` — markdown content negotiation, minimal scope
- `src/app/layout.tsx` — root layout with providers
- `src/components/layout/Providers.tsx` — wagmi + react-query singleton pattern
- `src/components/tv/Gnar3DTVClient.tsx:5` — `dynamic(() => import(...), { ssr: false })` for Three.js scene
- `src/components/tv/Gnar3DTV.tsx:8` — inner `dynamic()` for `Gnar3DTVScene`
- `src/workers/proposalSearch.worker.ts`, `src/workers/blogSearch.worker.ts` — Web Workers with MiniSearch

---

## Findings

### 1. `next.config.ts` — Missing Optimizations

**Current state:**

- `images.remotePatterns` uses a single wildcard `hostname: "**"` (line 56–57). This disables all domain validation.
- `typescript.ignoreBuildErrors: false` — correct, keep.
- `experimental.serverActions.bodySizeLimit: "10mb"` — set for video thumbnail uploads (line 64–66).
- No `poweredByHeader: false` (exposes Next.js version in response headers).
- No `compress: true` (defaults to true in production, but not explicit).
- No `output` mode set (missing opportunity for `standalone` output for Docker/Vercel optimization).
- No `webpack` or `turbo` customization for bundle analysis.
- No `headers()` security headers (CSP, X-Frame-Options, etc.).
- `generateBlogRedirects()` runs at build time by reading the filesystem with `gray-matter` — this is fine but adds a build-time dependency on the markdown files being present.

**Impact: Medium.** The wildcard image pattern is a security surface — any domain can serve images through Next.js image optimization proxy, which can be abused for bandwidth consumption.

---

### 2. `tsconfig.json` — Compiler Options

**Current state:**

- `target: "ES2020"` — slightly behind. Next.js 15 with React 19 supports `ES2022` natively on modern runtimes (V8), which would allow native `await` at top level and object spread without polyfill overhead.
- `strict: true` — correct.
- `incremental: true` — correct, speeds up type-check.
- `moduleResolution: "bundler"` — correct for Next.js + Turbopack.
- `isolatedModules: true` — correct, required for fast transpilation.
- `skipLibCheck: true` — acceptable but hides type issues in vendored packages.
- The `exclude` array at line 26 correctly excludes `references/**/*`, `scripts/**/*`, `subgraphs/**/*`, which prevents accidental inclusion of dev/vendor trees in the main build. (`mcp-subgraph/**/*` was removed when that directory was extracted to the builder-dao-tools repo.)

**No critical issues.** Changing `target` to `ES2022` is low-risk and marginally useful.

---

### 3. Dependency Audit — Unused, Heavy, or Suspicious Packages

The following packages are in `dependencies` but appear **not used anywhere in `src/`**:

| Package                                    | Version   | Evidence                                                     | Notes                                                                               |
| ------------------------------------------ | --------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `@huggingface/transformers`                | `^3.8.0`  | Zero imports in `src/`                                       | Large ML library (~dozens of MB). Should be devDep or removed entirely.             |
| `leva`                                     | `^0.10.1` | Zero imports in `src/`                                       | Debug GUI for Three.js. Dev-only tool shipped in production bundle.                 |
| `import-in-the-middle`                     | `^1.14.2` | Zero imports in `src/`                                       | OpenTelemetry instrumentation helper, likely leftover from a monitoring experiment. |
| `require-in-the-middle`                    | `^7.5.2`  | Zero imports in `src/`                                       | Same as above, pair package.                                                        |
| `react-masonry-css`                        | `^1.0.16` | Zero imports in `src/`                                       | CSS masonry layout component.                                                       |
| `papaparse` + `@types/papaparse`           | `^5.5.3`  | Zero imports in `src/`                                       | CSV parser. May be used only in `scripts/`.                                         |
| `better-sqlite3` + `@types/better-sqlite3` | `^12.5.0` | Zero imports in `src/`                                       | Node.js SQLite. Server-side only; should be serverExternalPackages or removed.      |
| `ogl`                                      | `^1.0.11` | Used only in `src/components/tv/FaultyTerminal.tsx:3`        | Single-use renderer; consider if component is production-critical.                  |
| `gl-matrix`                                | `^3.4.4`  | Used only in `src/components/tv/ReactBitsInfiniteMenu.tsx:4` | Low concern, small lib.                                                             |
| `gsap`                                     | `^3.14.2` | Used only in `src/components/TextType.tsx:4`                 | Full GSAP bundle for one animation component (~100KB min).                          |

**Heavy packages that ARE used:**
| Package | Where Used | Approx. Weight | Notes |
|---------|-----------|----------------|-------|
| `three` + `@react-three/fiber` + `@react-three/drei` | `src/components/tv/`, `src/components/lootbox/AnimatedChest3D.tsx` | ~500KB min | Lazy-loaded via `dynamic({ ssr: false })` in `Gnar3DTVClient.tsx` — correct pattern. |
| `framer-motion` | Only `src/components/layout/MuralBackground.tsx` | ~100KB min | MuralBackground is **commented out** in `src/app/layout.tsx:69`. The import still exists but the component is not rendered. |
| `leaflet` + `react-leaflet` + `leaflet-draw` + `leaflet.markercluster` + `react-leaflet-markercluster` | `src/app/map/page.tsx`, `src/components/ui/map.tsx` | Large, split per-route | Map page is "use client" but NOT dynamically imported; `map.tsx` component is 1347 lines. |
| `recharts` | `src/components/treasury/` charts, `src/components/ui/chart.tsx` | ~200KB min | Used in treasury charts, client-side only, not lazy-loaded. |
| `@react-three/drei` | TV scene, lootbox | Included in Three.js bundle | Fine since already lazy. |
| `@coinbase/onchainkit` | Providers, various | Large Web3 SDK | Used throughout, unavoidable. |

**Impact: HIGH for `@huggingface/transformers` and the two telemetry packages.** These are almost certainly in the production bundle today unless Turbopack tree-shakes them aggressively — which it may not for CJS modules.

---

### 4. Tailwind CSS v4 — Purge / Unused Styles

**Current state:**

- Tailwind v4 uses content detection automatically (no explicit `content` array needed).
- `globals.css` at line 1 uses `@import "tailwindcss"` — correct v4 pattern.
- The `@layer base` block (lines 116–187) contains **duplicated rules**: every Leaflet override is written twice (e.g., `.leaflet-container` appears at lines 123–126, `@apply` repeated on lines 125 and 124). This is cosmetic but adds CSS noise.
- `tw-animate-css` is imported at line 3, adding animation utilities. These are only used if referenced in components; Tailwind v4 purges unused utilities so impact is low.
- No `@source` directives needed — Tailwind v4 scans the project root by default.
- The sidebar token set (lines 19–19 through 113) is large but maps to shadcn sidebar component.

**Impact: Low.** The duplicate Leaflet rules are cosmetic. No major purge issue found.

---

### 5. Barrel Exports and Tree-Shaking

**Barrel files found:**

- `src/components/tv/index.ts` — exports 20+ symbols including Two wildcard re-exports (`export * from "./types"`, `export * from "./utils"`). However, **no file in `src/` actually imports from this barrel** — all imports go directly to specific files (e.g., `import { Gnar3DTVClient } from "@/components/tv/Gnar3DTVClient"`). The barrel is not causing tree-shaking problems.
- `src/components/proposals/transaction/index.ts` — named exports only, not wildcard. Not imported via barrel either.
- `src/components/proposals/builder/forms/index.ts` — named exports only.
- `src/lib/lootbox/index.ts` — three `export *` re-exports. Used internally within the lootbox feature.
- `src/components/lootbox/index.ts` — appears to export lootbox UI components.

**No actionable barrel tree-shaking problem.** The barrels exist but aren't used as the primary import path. Direct file imports are the pattern throughout `src/`.

---

### 6. Client Component Boundary Analysis

**Scale:** 202 files have `"use client"` across the codebase.

**Pages with `"use client"` (full-page client boundaries):**

| File                                                                             | Notes                                                                |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/app/auctions/page.tsx`                                                      | Entire auctions page is a client component — loses SSR/RSC benefits. |
| `src/app/lootbox/page.tsx`                                                       | Expected — requires wallet interactions throughout.                  |
| `src/app/map/page.tsx`                                                           | Expected — Leaflet requires DOM.                                     |
| `src/app/create-coin/page.tsx`                                                   | 872 lines of "use client" — large page, no server-side split.        |
| `src/app/demo/voting-power-notice/page.tsx`                                      | Demo page, low priority.                                             |
| `src/app/demo/proposal-components/page.tsx`                                      | Demo page, low priority.                                             |
| `src/app/debug/tv/page.tsx`                                                      | Debug page, low priority.                                            |
| Error boundaries (`members/error.tsx`, `proposals/error.tsx`, `blogs/error.tsx`) | Correct — error boundaries must be client components.                |

**`src/app/auctions/page.tsx` is the highest-impact concern.** Auctions is a core page. If the top-level component is "use client", the entire page tree hydrates on the client, including any static content that could be server-rendered.

**Key pattern: layout.tsx providers are correctly structured.** `Providers.tsx` is "use client" but is a thin wrapper. `DaoHeader.tsx` being "use client" (529 lines) means the entire header runs on the client, including any static nav links. This is likely necessary due to wallet connect state but worth verifying.

---

### 7. Dynamic Imports and Code Splitting

**Current dynamic imports:**

| File                                     | Lazily loaded module                       | SSR          |
| ---------------------------------------- | ------------------------------------------ | ------------ |
| `src/components/tv/Gnar3DTVClient.tsx:5` | `Gnar3DTV` (wrapper around Three.js scene) | `ssr: false` |
| `src/components/tv/Gnar3DTV.tsx:8`       | `Gnar3DTVScene` (Canvas + Three.js)        | `ssr: false` |

**That is the full extent of dynamic imports.** Only 2 instances in the entire codebase.

**Missing dynamic imports for heavy client-only components:**

| Component                                      | Why It Should Be Dynamic                                                                                                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/lootbox/AnimatedChest3D.tsx`   | 1514 lines, imports Three.js, but lootbox page is already full-client. Still benefits from splitting the 3D chunk.                                                               |
| `src/components/ui/map.tsx`                    | 1347 lines, imports Leaflet. Map page is `"use client"` but Leaflet is not lazy.                                                                                                 |
| `src/components/treasury/` recharts components | 4 chart components using Recharts, each "use client". Not deferred.                                                                                                              |
| `src/components/tv/ReactBitsInfiniteMenu.tsx`  | 1424 lines, imports `gl-matrix`. Used in TV feature — if the TV route is the only consumer, this is fine, but it's included in all route bundles that import from the TV barrel. |

**However,** since the TV barrel is not actually used externally, `ReactBitsInfiniteMenu` is only loaded on routes that use the TV feature. Still, it's not dynamically imported within the TV page itself.

---

### 8. Image Optimization

**Problems found:**

- `next.config.ts:53–57`: `hostname: "**"` wildcard bypasses domain verification for the image optimizer. Any URL can be proxied.
- 12 instances of `unoptimized` prop across the codebase:
  - `src/components/blogs/BlogCard.tsx:38` — blog thumbnails are not optimized
  - `src/components/tv/TVVideoPlayer.tsx:179,205,220` — video poster/thumbnail images not optimized
  - `src/components/feed/AuctionEventCard.tsx:132,181,223,251` — auction event images not optimized
  - `src/components/auctions/GnarCard.tsx:38` — auction card image not optimized
  - `src/components/droposals/DroposalCard.tsx:26` — droposal card image not optimized
  - `src/components/members/detail/MemberCreatedCoinsGrid.tsx:146` — coin grid image not optimized
  - `src/app/debug/og/page.tsx:66` — debug page, acceptable
- Only `src/components/auctions/GnarImageTile.tsx:21` uses a proper `sizes` attribute.
- Most `<Image>` components do not set `sizes`, meaning the browser downloads full-resolution images even on mobile.
- No `priority` prop detected on above-the-fold images (hero auction spotlight, gnar card in auction page).

**Impact: HIGH for perceived performance.** Auction images (most prominent content) are `unoptimized`. This means raw NFT images (often 1000x1000px+ PNGs) are served without resizing or format conversion (WebP/AVIF).

---

### 9. Middleware Analysis

`src/middleware.ts` is narrow in scope:

- Only activates for `Accept: text/markdown` requests on `/`, `/proposals`, and `/proposals/:id*`.
- Very low overhead — no auth, no token validation, no database calls.
- `matcher` config at line 22–24 is correctly specified.

**No issues.** The middleware is lean and correctly scoped.

---

### 10. Server Component vs Client Component Boundaries — Summary

**Correct patterns:**

- `src/app/layout.tsx` — Server Component, imports only `"use client"` wrappers.
- `src/app/page.tsx` — Server Component using `Suspense` with streaming.
- `src/app/proposals/[id]/page.tsx` — likely server (not marked `"use client"`).
- Worker files in `src/workers/` — not bundled as app code.

**Problematic patterns:**

- `src/app/auctions/page.tsx` — entire page is a client component.
- `src/app/create-coin/page.tsx` — 872-line client page.
- `src/components/layout/DaoHeader.tsx` — 529-line client component for the global header. Static nav links are serialized as client-side JS.
- `src/components/home/HomeStaticContent.tsx` — ironically named "static" but is `"use client"` and houses recharts components.

---

## Risks / Constraints

- Removing `@huggingface/transformers` only requires verifying it has zero runtime imports (confirmed). Safe to do.
- Removing `leva` requires the same verification. Confirmed safe.
- Removing `framer-motion` would require deleting or rewriting `MuralBackground.tsx` — but the component is already commented out in `layout.tsx`. The `framer-motion` dep can be removed once `MuralBackground` is confirmed permanently disabled.
- Converting `auctions/page.tsx` from full-client to RSC requires understanding which hooks/state it uses — this is a non-trivial refactor.
- The wildcard `hostname: "**"` change requires enumerating all external image domains used (IPFS gateways, Zora, Farcaster CDN, etc.) — effort to enumerate but high security value.
- `better-sqlite3` is a native module. If it is used in any server route (API routes or scripts), removing it from dependencies could break builds. It was not found in `src/` but may be used in `scripts/`.

---

## Open Questions

1. Is `@huggingface/transformers` used in any scripts outside `src/` (e.g., `scripts/` dir)? If so, move to devDependencies.
2. Is `better-sqlite3` used in any API routes not yet discovered, or only in `scripts/`? Same question.
3. Is `leva` used in any dev-only debug page that's excluded from the main bundle?
4. Is `MuralBackground` permanently disabled or is it planned to return?
5. Is the auctions page intentionally a full client component, or was it a convenience decision?
6. Why does `TVVideoPlayer.tsx` use `unoptimized` three times? Are these NFT media URLs from IPFS that Next.js image optimization can't handle? If so, this is acceptable; if not, optimization should be applied.

---

## Recommendations (Ranked by Impact)

### HIGH — Do First

**1. Remove or move unused heavy packages**

- Remove from `dependencies`: `@huggingface/transformers`, `leva`, `import-in-the-middle`, `require-in-the-middle`, `react-masonry-css`.
- Verify `papaparse` and `better-sqlite3` usage in `scripts/` then move to devDependencies if scripts-only.
- Remove `framer-motion` after confirming `MuralBackground` is permanently disabled.

Estimated bundle savings: `@huggingface/transformers` alone is 10–50MB in node_modules; actual JS bundle impact depends on whether Turbopack tree-shakes unused exports (unlikely for CJS).

**2. Fix image optimization — remove `unoptimized` props on content images**

Files to update:

- `src/components/auctions/GnarCard.tsx:38`
- `src/components/droposals/DroposalCard.tsx:26`
- `src/components/feed/AuctionEventCard.tsx` (4 instances)
- `src/components/blogs/BlogCard.tsx:38`

Add proper `sizes` attributes to all `<Image>` components in listing/grid views. Add `priority` to the first visible image on auction and home pages.

Note: IPFS-hosted NFT images may require keeping `unoptimized` if the `hostname: "**"` wildcard is replaced with a specific list that doesn't cover all IPFS gateways.

**3. Replace wildcard image hostname with explicit domain list**

Change `src/next.config.ts:53–57` from `hostname: "**"` to an explicit list:

- `ipfs.io`, `*.ipfs.io`, `cloudflare-ipfs.com`
- `zora.co`, `*.zora.co`, `zorb.dev`
- `warpcast.com`, `imagedelivery.net` (Farcaster CDN)
- `gnars.center`
- Any Alchemy/Goldsky image CDN domains

This is a **security fix** as much as a performance improvement.

### MEDIUM — Do Next

**4. Add `dynamic()` import for Leaflet map component**

`src/components/ui/map.tsx` (1347 lines) and its Leaflet dependencies should be dynamically imported in `src/app/map/page.tsx`. The page is already `"use client"` so the boundary is set; the issue is Leaflet loading on every page bundle.

**5. Add `dynamic()` for Recharts in treasury page**

The 4 treasury chart components (`AuctionBidsPerMonthChart`, `ProposalsPerMonthChart`, `AuctionTrendChart`, `TreasuryAllocationChart`) each import Recharts. They are client components but not lazy-loaded. Wrapping them in `dynamic({ ssr: false })` defers the ~200KB Recharts bundle to when the treasury page is actually visited.

**6. Audit `auctions/page.tsx` for RSC conversion potential**

If the auctions page has static display content (auction metadata, past auctions list) that doesn't require wallet state at render time, extract those into Server Components and push `"use client"` down to interactive elements only (bid form, bid button).

**7. Add `poweredByHeader: false` to `next.config.ts`**

One-line change. Removes `X-Powered-By: Next.js` header from all responses.

### LOW — Housekeeping

**8. Fix duplicate CSS rules in `globals.css`**

Lines 123–186: every Leaflet override has its `@apply` rule written twice. Remove duplicates. No functional impact, reduces CSS bundle by ~50 lines.

**9. Upgrade `tsconfig.json` target to `ES2022`**

Changes `target: "ES2020"` to `"ES2022"`. Marginal benefit for modern runtime environments.

**10. Add `sizes` attributes to remaining `<Image>` components**

26 files use `next/image`. Only 1 (`GnarImageTile.tsx`) has a `sizes` attribute. All grid/listing images should have appropriate `sizes` values to enable responsive image serving.

---

## File Path Reference

| Finding                               | Key Files                                                                                                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| next.config — image wildcard          | `/Users/r4to/Script/gnars-website/next.config.ts:52–57`                                                                                                                                       |
| next.config — missing poweredByHeader | `/Users/r4to/Script/gnars-website/next.config.ts:47`                                                                                                                                          |
| Unused heavy deps                     | `/Users/r4to/Script/gnars-website/package.json:17,22,59,60,69,85,88`                                                                                                                          |
| framer-motion commented out           | `/Users/r4to/Script/gnars-website/src/app/layout.tsx:69`                                                                                                                                      |
| Three.js dynamic import (correct)     | `/Users/r4to/Script/gnars-website/src/components/tv/Gnar3DTVClient.tsx:5`                                                                                                                     |
| Leaflet not dynamic                   | `/Users/r4to/Script/gnars-website/src/components/ui/map.tsx`                                                                                                                                  |
| Recharts not dynamic                  | `/Users/r4to/Script/gnars-website/src/components/treasury/`                                                                                                                                   |
| unoptimized images                    | `src/components/auctions/GnarCard.tsx:38`, `src/components/droposals/DroposalCard.tsx:26`, `src/components/feed/AuctionEventCard.tsx:132,181,223,251`, `src/components/blogs/BlogCard.tsx:38` |
| Full-page client components           | `src/app/auctions/page.tsx`, `src/app/create-coin/page.tsx`                                                                                                                                   |
| Duplicate CSS                         | `src/app/globals.css:123–186`                                                                                                                                                                 |
| Barrel wildcard exports               | `src/components/tv/index.ts:42–43` (not externally imported — low risk)                                                                                                                       |
