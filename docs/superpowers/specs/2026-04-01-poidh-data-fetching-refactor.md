# POIDH Data Fetching Refactor

**Date:** 2026-04-01
**Status:** Approved
**Scope:** Refactor bounties data fetching to match codebase SSR patterns

## Problem

The POIDH bounties feature uses a client-only data fetching pattern that diverges from the rest of the codebase:
- Both pages are `'use client'` — no SSR, no SEO, not CDN-cacheable
- 200 lines of business logic lives in API routes instead of a service layer
- Dual caching (Next.js revalidate + React Query) with unclear precedence
- No `generateMetadata`, no Suspense boundaries

The rest of the app uses: `src/services/*.ts` with `cache()` → async Server Components → `Suspense` → client components for interactivity.

## Design

### 1. Service Layer: `src/services/poidh.ts`

Two cached functions extracted from the existing API route logic:

```typescript
import { cache } from "react";

// Fetches bounty list from POIDH tRPC API
// Handles: status mapping (open→open, closed→past, voting→progress, all→merge)
// Handles: chain filtering, keyword matching, field normalization
export const fetchPoidhBounties = cache(async (options: {
  status?: 'open' | 'closed' | 'voting' | 'all';
  limit?: number;
  filterGnarly?: boolean;
}): Promise<{ bounties: PoidhBounty[]; total: number }> => { ... });

// Fetches single bounty + claims in parallel from POIDH tRPC API
// Handles: claims mapping, field normalization
// Claims can fail independently (bounty still returned without them)
export const fetchPoidhBounty = cache(async (
  chainId: number,
  id: number
): Promise<PoidhBounty | null> => { ... });
```

The `cache()` wrapper deduplicates within a single server render pass. External fetch calls keep `next: { revalidate: 900 }` (15min for list) and `next: { revalidate: 60 }` (1min for detail) for ISR.

### 2. List Page: `/community/bounties`

**`page.tsx`** — Server Component:
```typescript
export const metadata: Metadata = {
  title: "Challenges — Gnars",
  description: "Gnarly challenges from the action sports community...",
  // OG tags
};
export const revalidate = 60;

export default async function BountiesPage() {
  const data = await fetchPoidhBounties({ status: 'open' });
  return (
    <Suspense fallback={<BountiesPageSkeleton />}>
      <BountiesView initialBounties={data.bounties} />
    </Suspense>
  );
}
```

**`BountiesView.tsx`** — Client Component (new file, extracted from current page.tsx):
- Receives `initialBounties: PoidhBounty[]` prop
- Uses `usePoidhBounties` hook with `initialData` for the "open" status
- Normal React Query fetches when user switches to voting/closed/all
- Owns all filter state: status, search query, category
- Contains the stat row, filter toolbar, and BountyGrid

### 3. Detail Page: `/community/bounties/[chainId]/[id]`

**`page.tsx`** — Server Component:
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const bounty = await fetchPoidhBounty(chainId, id);
  return {
    title: `${bounty?.title || bounty?.name} — Gnars Challenges`,
    description: bounty?.description?.slice(0, 160),
    openGraph: { ... },
  };
}
export const revalidate = 60;

export default async function BountyDetailPage({ params }) {
  const bounty = await fetchPoidhBounty(chainId, id);
  if (!bounty) return <BountyNotFound />;
  return (
    <Suspense fallback={<BountyDetailSkeleton />}>
      <BountyDetailView initialBounty={bounty} chainId={chainId} bountyId={id} />
    </Suspense>
  );
}
```

**`BountyDetailView.tsx`** — Client Component (new file, extracted from current page.tsx):
- Receives `initialBounty: PoidhBounty`, `chainId: number`, `bountyId: number`
- Uses React Query with `initialData` for the bounty — enables background refresh
- Keeps all interactive behavior: voting, claiming, joining, wallet, countdown
- Loading/error states are now server-handled; client only shows interactive states

### 4. API Routes (thinned out)

**`src/app/api/poidh/bounties/route.ts`** (~15 lines):
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'open';
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const filterGnarly = searchParams.get('filterGnarly') !== 'false';

  try {
    const data = await fetchPoidhBounties({ status, limit, filterGnarly });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch bounties' }, { status: 500 });
  }
}
```

**`src/app/api/poidh/bounty/[chainId]/[id]/route.ts`** — same pattern, parse + call service + return.

### 5. Hook Changes

**`usePoidhBounties`** — add optional `initialData` parameter:
```typescript
export function usePoidhBounties(options: UsePoidhBountiesOptions & {
  initialData?: PoidhBountiesResponse;
} = {}) {
  const { initialData, ...rest } = options;
  return useQuery({
    ...existing config,
    initialData,
  });
}
```

### 6. Layout Metadata

The existing `src/app/community/bounties/layout.tsx` already has metadata. The new `page.tsx` metadata will override it for the list page; `generateMetadata` will override for detail pages. No layout changes needed.

## What stays the same

- All UI components: BountyCard, BountyGrid, BountyDetailView internals, modals, MediaEmbed
- All contract interaction hooks (`usePoidhContract.ts`)
- All POIDH config, ABI, keywords, types
- The `usePoidhBounties` hook interface (just adds optional initialData)
- The opengraph-image routes

## File changes summary

| Action | File |
|--------|------|
| **Create** | `src/services/poidh.ts` |
| **Create** | `src/components/bounties/BountiesView.tsx` |
| **Create** | `src/components/bounties/BountyDetailView.tsx` |
| **Rewrite** | `src/app/community/bounties/page.tsx` (Server Component) |
| **Rewrite** | `src/app/community/bounties/[chainId]/[id]/page.tsx` (Server Component) |
| **Rewrite** | `src/app/api/poidh/bounties/route.ts` (thin) |
| **Rewrite** | `src/app/api/poidh/bounty/[chainId]/[id]/route.ts` (thin) |
| **Edit** | `src/hooks/usePoidhBounties.ts` (add initialData) |

## Risks

- **POIDH API availability** — if the external API is down, server render will fail. Mitigated by ISR cache (serves stale page) and try/catch with error UI.
- **Large client component** — BountyDetailView will be ~600 lines (all the interactive logic from the current page). Acceptable for now; can be decomposed in a future PR.
- **React Query initialData hydration** — needs matching query keys between server-provided data and client hook. Verified by using the same hook with same key shape.
