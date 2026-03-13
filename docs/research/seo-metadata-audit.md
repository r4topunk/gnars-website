# Research — SEO Metadata & OG Images Audit

## Goal

Full inventory of all user-facing pages in `src/app/` to identify which have `metadata` / `generateMetadata` exports and which have `opengraph-image.tsx` files. This informs an agent team task to fill in missing SEO coverage.

---

## Page Status Table

Routes are grouped by coverage level. API routes, debug routes, demo routes, and miniapp-image routes are excluded — they are not indexable user-facing pages.

### Fully Covered (metadata + opengraph-image.tsx)

| Route | Metadata Source | OG Image File | Notes |
|---|---|---|---|
| `/` | `src/app/page.tsx` (static export) | `src/app/opengraph-image.tsx` | Full coverage; also has Twitter card in root layout |
| `/auctions` | `src/app/auctions/layout.tsx` (static export) | `src/app/auctions/opengraph-image.tsx` | Layout carries metadata; OG image fetches live auction data from subgraph |
| `/proposals` (list) | `src/app/proposals/page.tsx` (static export) + layout | `src/app/proposals/layout.tsx` uses miniapp OG image URL | Layout has full OG+Twitter+fc:miniapp; page.tsx has `alternates.canonical` only |
| `/proposals/[id]` | `src/app/proposals/[id]/page.tsx` (`generateMetadata`) | `src/app/proposals/[id]/opengraph-image.tsx` | Dynamic; fetches proposal title/status from service |
| `/map` | `src/app/map/layout.tsx` (static export) | `src/app/map/opengraph-image.tsx` | Layout has full OG+Twitter+fc:miniapp; OG draws a dark world map with SVG markers |
| `/droposals` (list) | `src/app/droposals/layout.tsx` (static export) | `src/app/droposals/[id]/opengraph-image.tsx` (per-item only) | Layout has OG+Twitter+fc:miniapp; **the list page itself has no dedicated OG image** |
| `/droposals/[id]` | `src/app/droposals/[id]/page.tsx` (`generateMetadata`) | `src/app/droposals/[id]/opengraph-image.tsx` | Dynamic; fetches decoded droposal params from subgraph |
| `/members/[address]` | `src/app/members/[address]/page.tsx` (`generateMetadata`) | `src/app/members/[address]/opengraph-image.tsx` | Dynamic; fetches member stats via API route `/api/member-og-data/[address]` |
| `/treasury` | (none in page.tsx — relies on root layout) | `src/app/treasury/opengraph-image.tsx` | OG image fetches live balances; **page has no `metadata` export** |
| `/tv` | `src/app/tv/layout.tsx` (static export) | `src/app/tv/opengraph-image.tsx` | Layout has full OG+Twitter+fc:miniapp |
| `/tv/[coinAddress]` | `src/app/tv/[coinAddress]/page.tsx` (`generateMetadata`) | Inherits from `/tv` layout | Dynamic; fetches coin name/image from Zora SDK |
| `/about` | `src/app/about/page.tsx` (static export) | None — inherits root OG image | Has `alternates.canonical`; missing dedicated OG image |
| `/blogs/[slug]` | `src/app/blogs/[slug]/page.tsx` (`generateMetadata`) | None — uses blog's `imageUrl` field via standard `openGraph.images` in metadata | OG image from blog data embedded in metadata, not a file-based OG image |
| `/[slug]` | `src/app/[slug]/page.tsx` (`generateMetadata`) | None | Static markdown blog posts under `/blog/` prefix; metadata from frontmatter |

### Missing Metadata (no export at all)

| Route | Page File | What It Is | Priority |
|---|---|---|---|
| `/blogs` | `src/app/blogs/page.tsx` | Blog listing page — all Gnars community blog posts | High |
| `/members` | `src/app/members/page.tsx` | Member directory — all DAO token holders and delegates | High |
| `/propdates` | `src/app/propdates/page.tsx` | Proposal updates feed — progress reports on funded proposals | High |
| `/propdates/[txid]` | `src/app/propdates/[txid]/page.tsx` | Single propdate detail — update on a specific proposal | Medium |
| `/propose` | `src/app/propose/page.tsx` | Proposal creation wizard — form to submit a governance proposal | Medium |
| `/lootbox` | `src/app/lootbox/page.tsx` | Lootbox V4 UI — NFT prize box mechanics and admin controls | Low (internal/admin feel) |
| `/mural` | `src/app/mural/page.tsx` | Interactive draggable grid of all Gnars NFTs | Low (visual tool) |
| `/coin-proposal` | `src/app/coin-proposal/page.tsx` | DAO proposal wizard for buying Zora creator coins | Low (internal tool) |
| `/create-coin` | `src/app/create-coin/page.tsx` | Create a new Zora creator coin (client component page) | Low (internal tool) |
| `/feed` | `src/app/feed/page.tsx` | Live DAO activity feed — governance, auction, and token events | Medium |
| `/treasury` | `src/app/treasury/page.tsx` | Treasury dashboard — ETH/token balances, charts, NFT holdings | High (has OG image file but no metadata export!) |

---

## Key Observations

### 1. Treasury anomaly
`/treasury/page.tsx` has NO `metadata` export but DOES have `src/app/treasury/opengraph-image.tsx`. The OG image is well-built (fetches live ETH balance + USD total). Only the metadata text object is missing.

### 2. `/droposals` list page has no OG image file
`src/app/droposals/layout.tsx` exports `metadata` with the OG image URL pulled from `DROPOSALS_MINIAPP_CONFIG.miniapp.ogImageUrl` (a static URL string). There is no `opengraph-image.tsx` at `src/app/droposals/opengraph-image.tsx`. This is fine — it uses a static URL — but it's inconsistent with other sections that have file-based dynamic OG images.

### 3. Proposals list has duplicate metadata (layout + page.tsx)
Both `src/app/proposals/layout.tsx` and `src/app/proposals/page.tsx` export `metadata`. In Next.js, the more specific (page-level) wins. The layout has the richer object (OG, Twitter, fc:miniapp); the page just has title, description, and canonical. They should be merged or the page-level should be removed.

### 4. Blogs list page has zero SEO
`src/app/blogs/page.tsx` has no `metadata` export and no OG image. This is a content-rich listing page that deserves both.

### 5. Consistent pattern across well-covered pages
All fully-covered static pages follow the same pattern:
- Static: `export const metadata: Metadata = { ... }` with title, description, `alternates.canonical`, and OG/Twitter blocks
- Dynamic: `export async function generateMetadata({ params })` fetching data from services/subgraph
- OG images: use `OG_SIZE`, `OG_COLORS`, `OG_FONTS` from `src/lib/og-utils.ts`; export `alt`, `size`, `contentType`, and default `Image()` function; include `renderFallback()` for error states

---

## Reference: OG Image Pattern

The canonical pattern used across the project (from `src/app/auctions/opengraph-image.tsx`):

```typescript
import { ImageResponse } from "next/og";
import { OG_SIZE, OG_COLORS, OG_FONTS } from "@/lib/og-utils";

export const alt = "[Page Name]";
export const size = OG_SIZE; // { width: 1200, height: 630 }
export const contentType = "image/png";
export const revalidate = 60; // for dynamic data

export default async function Image() {
  // Optional: fetch live data
  return new ImageResponse(<JSX />, { ...size });
}

function renderFallback(message: string) {
  return new ImageResponse(<fallback JSX />, { ...size });
}
```

Color palette from `src/lib/og-utils.ts`:
- `background: "#000"`, `foreground: "#fff"`, `card: "#111"`, `muted: "#888"`, `mutedLight: "#aaa"`
- `accent: "#22c55e"` (green), `destructive: "#ef4444"` (red), `blue: "#488bf4"`, `accentYellow: "#fbbf24"`

---

## Reference: Metadata Pattern

Static page pattern:
```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Title | Gnars",
  description: "Descriptive text under 160 chars",
  alternates: { canonical: "/route" },
  openGraph: {
    title: "...",
    description: "...",
    images: [...],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "...",
    description: "...",
    images: [...],
  },
};
```

Dynamic page pattern:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await fetchData(params.id);
  if (!data) return { title: "Not Found | Gnars" };
  return {
    title: `${data.title} | Gnars`,
    description: data.description?.slice(0, 160),
    openGraph: { ... },
  };
}
```

---

## OG Image Files: Complete Inventory

| File | Status |
|---|---|
| `src/app/opengraph-image.tsx` | Exists — static, shows Gnars logo + tagline |
| `src/app/auctions/opengraph-image.tsx` | Exists — dynamic, shows current auction token + bid |
| `src/app/proposals/[id]/opengraph-image.tsx` | Exists — dynamic, shows vote counts + proposal title |
| `src/app/droposals/[id]/opengraph-image.tsx` | Exists — dynamic, shows droposal image + sale info |
| `src/app/members/[address]/opengraph-image.tsx` | Exists — dynamic, shows member stats via API |
| `src/app/map/opengraph-image.tsx` | Exists — static, draws dark world map SVG with location markers |
| `src/app/treasury/opengraph-image.tsx` | Exists — dynamic, shows ETH balance + USD total |
| `src/app/tv/opengraph-image.tsx` | Exists — static, "Gnar TV / Creator Coins Feed" branding |

Missing OG image files (pages with no file-based image):
- `src/app/blogs/opengraph-image.tsx` — needed
- `src/app/members/opengraph-image.tsx` — needed (list page)
- `src/app/propdates/opengraph-image.tsx` — needed
- `src/app/about/opengraph-image.tsx` — optional (static info page, root image is acceptable)
- `src/app/propose/opengraph-image.tsx` — optional (tool page)
- `src/app/feed/opengraph-image.tsx` — optional

---

## Risks / Constraints

- **Edge runtime**: Most OG files don't declare `export const runtime = "edge"` (only `map/opengraph-image.tsx` does). The pattern without runtime declaration works in Node.js runtime (default). Keep consistent — don't add `runtime = "edge"` unless needed.
- **External fetches in OG images**: `treasury/opengraph-image.tsx` and `auctions/opengraph-image.tsx` call internal API routes (`/api/alchemy`, `/api/eth-price`, etc.). These require `getBaseUrl()` / `getOriginFromHeaders()` helpers — copy the same pattern.
- **`members/[address]/opengraph-image.tsx` does not use `OG_SIZE` / `OG_COLORS`**: It inlines its own size `{ width: 1200, height: 630 }` and colors `#000`, `#111`, etc. This is functionally identical but inconsistent. New files should use the shared utils.
- **`proposals/layout.tsx` vs `proposals/page.tsx` metadata conflict**: Next.js merges metadata in the same segment — page-level wins for duplicated keys. The layout's richer OG/Twitter/miniapp block survives because `page.tsx` doesn't set those keys. No immediate bug, but worth cleaning up.
- **`create-coin/page.tsx` is a client component** (`"use client"`): Metadata cannot be exported from client components in Next.js. A server wrapper page would be needed to add metadata to this route.

---

## Open Questions

1. Should `/lootbox`, `/mural`, `/coin-proposal`, and `/create-coin` be indexed at all? They look like internal/admin tools. If not, a `robots` export blocking those routes would be cleaner than adding SEO metadata.
2. Does `/feed` warrant a live-data OG image (e.g., showing last N events), or is a static branded image sufficient?
3. For `/blogs`, should the OG image show a grid of recent blog thumbnails, or just branded static text?
4. For `/propdates/[txid]`, what data is available from `getPropdateByTxid`? (see `src/services/propdates.ts`) — needed to spec the `generateMetadata` content.

---

## Recommendation

Prioritize in this order:

**P0 — Missing metadata only (trivial, high impact):**
1. `/treasury` — add `metadata` export to `src/app/treasury/page.tsx`; OG image file already exists

**P1 — Missing metadata + OG image (content pages):**
2. `/blogs` — static metadata + `opengraph-image.tsx` showing "Gnars Blog" branding
3. `/members` — static metadata + `opengraph-image.tsx` showing member count or DAO stats
4. `/propdates` — static metadata + `opengraph-image.tsx` showing "Propdates" branding
5. `/feed` — static metadata + simple branded OG image

**P2 — Dynamic metadata only (detail pages):**
6. `/propdates/[txid]` — `generateMetadata` fetching propdate title/description
7. `/propose` — static metadata (tool page, low SEO value but worth having)

**P3 — Deprioritize or noindex:**
- `/lootbox`, `/mural`, `/coin-proposal`, `/create-coin` — decide on indexability first

All new static OG images should follow the `src/app/tv/opengraph-image.tsx` pattern (simplest: just branding + title, no external data). All new metadata exports should follow the `src/app/about/page.tsx` pattern.
