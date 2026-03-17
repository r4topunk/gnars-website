---
name: build-bundle-audit-findings
description: Key findings from the March 2026 build configuration and bundle optimization audit. Covers unused deps, image issues, Client Component sprawl, and missing dynamic imports.
type: project
---

Build/bundle audit completed March 2026. Full report at `docs/research/build-bundle-audit.md`.

**Why:** User requested a deep review of next.config, tsconfig, deps, Tailwind, barrel exports, client boundaries, dynamic imports, image optimization, and middleware.

**How to apply:** Use these findings to scope implementation work or prioritize PRs.

## Critical Findings

### Unused production dependencies (should be removed)
- `@huggingface/transformers` — zero imports in `src/`, massive ML library in prod bundle
- `leva` — zero imports in `src/`, Three.js debug GUI
- `import-in-the-middle` + `require-in-the-middle` — zero imports, OpenTelemetry leftovers
- `react-masonry-css` — zero imports in `src/`
- `framer-motion` — only import is `MuralBackground.tsx`, which is **commented out** in `layout.tsx`
- `papaparse` + `better-sqlite3` — check if scripts-only; if so move to devDeps

### Image optimization gaps
- `next.config.ts:53–57` uses wildcard `hostname: "**"` — security + performance issue
- 12 uses of `unoptimized` prop, including core content (auction cards, droposal cards, blog cards, auction feed)
- Only 1 of 26 `next/image` usages has `sizes` attribute

### No dynamic imports except Three.js
- Leaflet (`src/components/ui/map.tsx`, 1347 lines) — not lazy loaded
- Recharts (4 treasury chart components) — not lazy loaded
- Three.js/Gnar3DTV is correctly lazy via `dynamic({ ssr: false })` in `Gnar3DTVClient.tsx:5`

### Client Component sprawl
- `src/app/auctions/page.tsx` — entire auctions page is "use client"
- `src/app/create-coin/page.tsx` — 872-line client page
- `src/components/layout/DaoHeader.tsx` — 529-line client global header

### next.config gaps
- Missing `poweredByHeader: false`
- No `serverExternalPackages` for `better-sqlite3`

### CSS
- `globals.css` lines 123–186: every Leaflet override is written twice (duplicate @apply rules)
