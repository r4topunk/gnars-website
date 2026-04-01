# POIDH Data Fetching Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor POIDH bounties from client-only rendering to SSR with service layer, matching the codebase's proposals pattern.

**Architecture:** Extract business logic from API routes into `src/services/poidh.ts` with React `cache()`. Convert both pages from `'use client'` to async Server Components that pre-fetch default data and pass it to client View components. Keep React Query for client-side filter changes.

**Tech Stack:** Next.js 15 App Router, React `cache()`, React Query `initialData`, Suspense

**Spec:** `docs/superpowers/specs/2026-04-01-poidh-data-fetching-refactor.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/services/poidh.ts` | Cached service functions for fetching bounties from POIDH tRPC API |
| Create | `src/components/bounties/BountiesView.tsx` | Client component: filters, stats, grid (extracted from current page.tsx) |
| Create | `src/components/bounties/BountyDetailView.tsx` | Client component: interactive bounty detail (extracted from current [id]/page.tsx) |
| Rewrite | `src/app/community/bounties/page.tsx` | Server Component: SSR with Suspense |
| Rewrite | `src/app/community/bounties/[chainId]/[id]/page.tsx` | Server Component: SSR with generateMetadata |
| Rewrite | `src/app/api/poidh/bounties/route.ts` | Thin route: parse params, call service |
| Rewrite | `src/app/api/poidh/bounty/[chainId]/[id]/route.ts` | Thin route: parse params, call service |
| Edit | `src/hooks/usePoidhBounties.ts` | Add optional `initialData` support |
| Export | `src/components/bounties/BountyGrid.tsx` | Export `SkeletonCard` grid for Suspense fallback |

## Parallelization

Tasks 1, 2, and 3 are **independent** and can run in parallel:
- Task 1: Service layer
- Task 2: BountiesView client component
- Task 3: BountyDetailView client component

Tasks 4 and 5 depend on Tasks 1+2 and 1+3 respectively:
- Task 4: List page SSR (needs service + BountiesView)
- Task 5: Detail page SSR (needs service + BountyDetailView)

Task 6 depends on Task 1:
- Task 6: Thin API routes (needs service)

Task 7 is independent:
- Task 7: Hook update

---

### Task 1: Create Service Layer

**Files:**
- Create: `src/services/poidh.ts`

- [ ] **Step 1: Create `src/services/poidh.ts`**

Extract all business logic from the two API routes into cached service functions. This is a direct extraction — the logic already works, we're just moving it.

```typescript
import { cache } from "react";
import { matchesGnarsKeywords } from "@/lib/poidh/keywords";
import { SUPPORTED_CHAINS } from "@/lib/poidh/config";
import type { PoidhBounty, PoidhClaim } from "@/types/poidh";

const POIDH_TRPC = "https://poidh.xyz/api/trpc";
const LIST_CACHE_TTL = 60 * 15; // 15 minutes
const DETAIL_CACHE_TTL = 60; // 1 minute

const SUPPORTED_CHAIN_IDS: number[] = Object.values(SUPPORTED_CHAINS);

interface FetchBountiesOptions {
  status?: "open" | "closed" | "voting" | "all";
  limit?: number;
  filterGnarly?: boolean;
}

interface FetchBountiesResult {
  bounties: PoidhBounty[];
  total: number;
}

async function fetchFromPoidh(
  endpoint: string,
  input: Record<string, unknown>,
  revalidate: number,
): Promise<unknown> {
  const encodedInput = encodeURIComponent(JSON.stringify({ json: input }));
  const url = `${POIDH_TRPC}/${endpoint}?input=${encodedInput}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`POIDH API error: ${res.status} from ${endpoint}`);
  const data = await res.json();
  return data?.result?.data?.json;
}

async function fetchBountiesByStatus(
  status: string,
  limit: number,
): Promise<PoidhBounty[]> {
  const data = await fetchFromPoidh(
    "bounties.fetchAll",
    { status, sortType: "date", limit },
    LIST_CACHE_TTL,
  );
  return ((data as { items?: PoidhBounty[] })?.items ?? []) as PoidhBounty[];
}

function normalizeBounties(
  bounties: PoidhBounty[],
  rawStatus: string,
  filterGnarly: boolean,
): PoidhBounty[] {
  return bounties
    .filter((bounty) => {
      if (!SUPPORTED_CHAIN_IDS.includes(bounty.chainId)) return false;
      if (filterGnarly) {
        return matchesGnarsKeywords(`${bounty.title} ${bounty.description}`);
      }
      return true;
    })
    .map((b) => ({
      ...b,
      isOpenBounty: b.isOpenBounty ?? b.isMultiplayer,
      isCompleted:
        rawStatus === "all" ? (b.isCompleted ?? false) : rawStatus === "closed",
    }));
}

export const fetchPoidhBounties = cache(
  async (options: FetchBountiesOptions = {}): Promise<FetchBountiesResult> => {
    const { status = "open", limit = 100, filterGnarly = false } = options;
    const clampedLimit = Math.min(Math.max(limit, 1), 500);

    let bounties: PoidhBounty[];

    if (status === "all") {
      const statuses = ["open", "progress", "past"];
      const results = await Promise.all(
        statuses.map(async (s) => {
          const items = await fetchBountiesByStatus(s, Math.ceil(clampedLimit / 3));
          return items.map((item) => ({
            ...item,
            isCompleted: s === "past",
          }));
        }),
      );
      bounties = results.flat().slice(0, clampedLimit);
    } else {
      const statusMap: Record<string, string> = {
        open: "open",
        closed: "past",
        voting: "progress",
      };
      bounties = await fetchBountiesByStatus(
        statusMap[status] || "open",
        clampedLimit,
      );
    }

    const normalized = normalizeBounties(bounties, status, filterGnarly);
    return { bounties: normalized, total: normalized.length };
  },
);

function mapClaims(rawClaims: unknown[]): PoidhClaim[] {
  return rawClaims.map((c: unknown) => {
    const claim = c as {
      id: number;
      bountyId: number;
      title?: string;
      description?: string;
      issuer: string;
      isAccepted: boolean;
      url?: string | null;
    };
    return {
      id: claim.id,
      bountyId: claim.bountyId,
      name: claim.title || `Claim #${claim.id}`,
      description: claim.description || "",
      issuer: claim.issuer,
      createdAt: 0,
      accepted: claim.isAccepted,
      url: claim.url || null,
    };
  });
}

export const fetchPoidhBounty = cache(
  async (chainId: number, id: number): Promise<PoidhBounty | null> => {
    if (!SUPPORTED_CHAIN_IDS.includes(chainId)) return null;
    if (isNaN(id) || id < 1) return null;

    const bountyData = await fetchFromPoidh(
      "bounties.fetch",
      { id, chainId },
      DETAIL_CACHE_TTL,
    );

    if (!bountyData) return null;
    const bounty = bountyData as PoidhBounty;

    // Fetch claims in parallel — can fail independently
    let claims: PoidhClaim[] = [];
    try {
      const claimsData = await fetchFromPoidh(
        "claims.fetchBountyClaims",
        { bountyId: id, chainId, limit: 50 },
        DETAIL_CACHE_TTL,
      );
      const rawItems = (claimsData as { items?: unknown[] })?.items ?? [];
      claims = mapClaims(rawItems);
    } catch {
      // Claims fetch failed — bounty still usable
    }

    return {
      ...bounty,
      isOpenBounty: bounty.isOpenBounty ?? bounty.isMultiplayer,
      claims,
    };
  },
);
```

- [ ] **Step 2: Verify the service compiles**

Run: `pnpm exec tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `src/services/poidh.ts`

- [ ] **Step 3: Commit**

```bash
git add src/services/poidh.ts
git commit -m "feat(poidh): create service layer with cached fetch functions"
```

---

### Task 2: Extract BountiesView Client Component

**Files:**
- Create: `src/components/bounties/BountiesView.tsx`
- Edit: `src/hooks/usePoidhBounties.ts` (add initialData)
- Edit: `src/components/bounties/BountyGrid.tsx` (export skeleton)

- [ ] **Step 1: Update `usePoidhBounties` hook to accept `initialData`**

Replace `src/hooks/usePoidhBounties.ts` with:

```typescript
import { useQuery } from '@tanstack/react-query';
import type { PoidhBounty } from '@/types/poidh';

interface UsePoidhBountiesOptions {
  status?: 'open' | 'closed' | 'voting' | 'all';
  limit?: number;
  filterGnarly?: boolean;
  initialData?: PoidhBountiesResponse;
}

interface PoidhBountiesResponse {
  bounties: PoidhBounty[];
  total: number;
}

export function usePoidhBounties(options: UsePoidhBountiesOptions = {}) {
  const { status = 'open', limit = 100, filterGnarly = false, initialData } = options;

  return useQuery<PoidhBountiesResponse, Error>({
    queryKey: ['poidh-bounties', status, limit, filterGnarly],
    queryFn: async () => {
      const params = new URLSearchParams({
        status,
        limit: limit.toString(),
        filterGnarly: filterGnarly.toString(),
      });

      const res = await fetch(`/api/poidh/bounties?${params}`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || 'Failed to fetch bounties');
      }

      return res.json();
    },
    initialData,
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export type { PoidhBountiesResponse };
```

- [ ] **Step 2: Export `BountyGridSkeleton` from `BountyGrid.tsx`**

Add at the end of `src/components/bounties/BountyGrid.tsx`, after the existing `BountyGrid` function:

```typescript
export function BountyGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/bounties/BountiesView.tsx`**

This is the current `page.tsx` content moved to a client component, with `initialBounties` prop feeding `initialData` into the hook:

```typescript
'use client';

import { useState, useMemo } from 'react';
import { BountyGrid } from '@/components/bounties/BountyGrid';
import { usePoidhBounties } from '@/hooks/usePoidhBounties';
import { CreateBountyModal } from '@/components/bounties/CreateBountyModal';
import { PlusCircle, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatEther } from 'viem';
import { useEthPrice, formatEthToUsd } from '@/hooks/use-eth-price';
import type { PoidhBounty } from '@/types/poidh';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'skate', label: 'Skate' },
  { key: 'surf', label: 'Surf' },
  { key: 'parkour', label: 'Parkour' },
  { key: 'weed', label: 'Weed' },
] as const;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  skate: ['skate', 'skateboard', 'kickflip', 'grind', 'ollie', 'flip', 'trick'],
  surf: ['surf', 'wave', 'barrel', 'tube', 'ocean', 'beach'],
  parkour: ['parkour', 'freerun', 'vault', 'flip', 'jump'],
  weed: ['weed', 'cannabis', 'joint', 'blunt', '420', 'smoke', 'kush'],
};

interface BountiesViewProps {
  initialBounties: PoidhBounty[];
}

export function BountiesView({ initialBounties }: BountiesViewProps) {
  const [status, setStatus] = useState<'open' | 'closed' | 'voting' | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGnarly, setFilterGnarly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('skate');

  const { data, isLoading, error } = usePoidhBounties({
    status,
    filterGnarly,
    // Only use initialData for the default "open" status
    initialData: status === 'open' ? { bounties: initialBounties, total: initialBounties.length } : undefined,
  });

  const { ethPrice } = useEthPrice();

  const filteredBounties = data?.bounties.filter((bounty) => {
    const text = `${bounty.title} ${bounty.description}`.toLowerCase();

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      if (!text.includes(query)) return false;
    }

    if (categoryFilter === 'all') return true;
    return CATEGORY_KEYWORDS[categoryFilter]?.some((keyword) => text.includes(keyword));
  }) || [];

  const totalValue = useMemo(() => {
    const totalWei = filteredBounties.reduce((sum, bounty) => {
      return sum + BigInt(bounty.amount ?? 0);
    }, 0n);
    const totalEth = parseFloat(formatEther(totalWei));
    const totalUsd = formatEthToUsd(totalEth, ethPrice);
    return { eth: totalEth.toFixed(4), usd: totalUsd, count: filteredBounties.length };
  }, [filteredBounties, ethPrice]);

  const statusLabel = status !== 'all' ? status : '';

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Challenges</h1>
            <p className="text-muted-foreground mt-1">
              Gnarly challenges from the action sports community.{' '}
              <a
                href="https://poidh.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground transition-colors"
              >
                Powered by POIDH
              </a>
            </p>
          </div>
          <CreateBountyModal>
            <Button className="shrink-0">
              <PlusCircle className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Create Bounty</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </CreateBountyModal>
        </div>

        {/* Pool stats */}
        {data && !isLoading && (
          <div className="grid grid-cols-3 gap-4 rounded-lg border border-border bg-muted/30 px-5 py-4">
            <div>
              <div className="text-2xl font-bold tabular-nums tracking-tight">
                {totalValue.eth}
                <span className="text-base font-semibold text-muted-foreground ml-1.5">ETH</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {statusLabel ? `${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)} pool` : 'Total pool'}
              </div>
            </div>
            {ethPrice > 0 && (
              <div>
                <div className="text-2xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                  {totalValue.usd}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">USD value</div>
              </div>
            )}
            <div>
              <div className="text-2xl font-bold tabular-nums tracking-tight">
                {totalValue.count}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {statusLabel ? `${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)} bounties` : 'Bounties'}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bounties..."
              className="pl-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <TabsList>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="voting">Voting</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="h-5 w-px bg-border hidden sm:block" />
            <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
              <TabsList>
                {CATEGORIES.map(({ key, label }) => (
                  <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Grid */}
        <BountyGrid
          bounties={filteredBounties}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePoidhBounties.ts src/components/bounties/BountyGrid.tsx src/components/bounties/BountiesView.tsx
git commit -m "feat(poidh): extract BountiesView client component with initialData support"
```

---

### Task 3: Extract BountyDetailView Client Component

**Files:**
- Create: `src/components/bounties/BountyDetailView.tsx`

- [ ] **Step 1: Create `src/components/bounties/BountyDetailView.tsx`**

Move the entire content of the current `src/app/community/bounties/[chainId]/[id]/page.tsx` into this new file with these changes:
1. Rename the default export to `export function BountyDetailView`
2. Change the component signature to accept props instead of using `useParams`:
   ```typescript
   interface BountyDetailViewProps {
     initialBounty: PoidhBounty;
     chainId: number;
     bountyId: number;
   }
   export function BountyDetailView({ initialBounty, chainId, bountyId }: BountyDetailViewProps)
   ```
3. Remove `useParams()` — use `chainId` and `bountyId` from props
4. Use React Query with `initialData` for the bounty fetch:
   ```typescript
   const { data, isLoading, error } = useQuery<{ bounty: PoidhBounty }>({
     queryKey: ['poidh-bounty', chainId, bountyId],
     queryFn: async () => {
       const res = await fetch(`/api/poidh/bounty/${chainId}/${bountyId}`);
       if (!res.ok) throw new Error('Bounty not found');
       return res.json();
     },
     initialData: { bounty: initialBounty },
     staleTime: 60_000,
   });
   ```
5. Remove the loading skeleton at the top (server handles that now) — keep the `if (!bounty) return null` guard
6. Remove the error/not-found state (server handles that now)
7. Keep ALL interactive logic: voting, claiming, joining, wallet, countdown, contract reads

The file keeps `'use client'` at top. All imports stay the same except `useParams` is removed.

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit --pretty 2>&1 | grep -i "BountyDetailView" | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/bounties/BountyDetailView.tsx
git commit -m "feat(poidh): extract BountyDetailView client component"
```

---

### Task 4: Rewrite List Page as Server Component

**Files:**
- Rewrite: `src/app/community/bounties/page.tsx`

**Depends on:** Task 1 (service), Task 2 (BountiesView)

- [ ] **Step 1: Rewrite `src/app/community/bounties/page.tsx`**

Replace the entire file with a Server Component:

```typescript
import { Suspense } from "react";
import { fetchPoidhBounties } from "@/services/poidh";
import { BountiesView } from "@/components/bounties/BountiesView";
import { BountyGridSkeleton } from "@/components/bounties/BountyGrid";

export const revalidate = 60;

export default async function BountiesPage() {
  let bounties;
  try {
    const data = await fetchPoidhBounties({ status: "open" });
    bounties = data.bounties;
  } catch {
    bounties = [];
  }

  return (
    <Suspense fallback={<BountyGridSkeleton />}>
      <BountiesView initialBounties={bounties} />
    </Suspense>
  );
}
```

Note: Metadata is already in `layout.tsx` — no need to duplicate here.

- [ ] **Step 2: Verify build**

Run: `pnpm build 2>&1 | tail -20`
Expected: Build succeeds, `/community/bounties` shows as dynamic route

- [ ] **Step 3: Commit**

```bash
git add src/app/community/bounties/page.tsx
git commit -m "feat(poidh): convert bounties list page to SSR with Suspense"
```

---

### Task 5: Rewrite Detail Page as Server Component

**Files:**
- Rewrite: `src/app/community/bounties/[chainId]/[id]/page.tsx`

**Depends on:** Task 1 (service), Task 3 (BountyDetailView)

- [ ] **Step 1: Rewrite `src/app/community/bounties/[chainId]/[id]/page.tsx`**

Replace the entire file with a Server Component:

```typescript
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPoidhBounty } from "@/services/poidh";
import { BountyDetailView } from "@/components/bounties/BountyDetailView";
import { Skeleton } from "@/components/ui/skeleton";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ chainId: string; id: string }>;
}

function parseParams(params: { chainId: string; id: string }) {
  return {
    chainId: parseInt(params.chainId, 10),
    bountyId: parseInt(params.id, 10),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { chainId, bountyId } = parseParams(await params);
  const bounty = await fetchPoidhBounty(chainId, bountyId);

  if (!bounty) {
    return { title: "Bounty Not Found — Gnars" };
  }

  const title = `${bounty.title || bounty.name} — Gnars Challenges`;
  const description = (bounty.description || "").slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function DetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Skeleton className="h-8 w-32 mb-6" />
      <Skeleton className="h-12 w-3/4 mb-4" />
      <Skeleton className="h-24 w-full mb-8" />
      <div className="grid md:grid-cols-3 gap-6">
        <Skeleton className="h-48 col-span-2" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

export default async function BountyDetailPage({ params }: PageProps) {
  const { chainId, bountyId } = parseParams(await params);
  const bounty = await fetchPoidhBounty(chainId, bountyId);

  if (!bounty) {
    notFound();
  }

  return (
    <Suspense fallback={<DetailSkeleton />}>
      <BountyDetailView
        initialBounty={bounty}
        chainId={chainId}
        bountyId={bountyId}
      />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build 2>&1 | tail -20`
Expected: Build succeeds, `/community/bounties/[chainId]/[id]` shows as dynamic route

- [ ] **Step 3: Commit**

```bash
git add src/app/community/bounties/\[chainId\]/\[id\]/page.tsx
git commit -m "feat(poidh): convert bounty detail page to SSR with generateMetadata"
```

---

### Task 6: Thin Out API Routes

**Files:**
- Rewrite: `src/app/api/poidh/bounties/route.ts`
- Rewrite: `src/app/api/poidh/bounty/[chainId]/[id]/route.ts`

**Depends on:** Task 1 (service)

- [ ] **Step 1: Rewrite `src/app/api/poidh/bounties/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchPoidhBounties } from "@/services/poidh";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") || "open") as "open" | "closed" | "voting" | "all";
  let limit = parseInt(searchParams.get("limit") || "100", 10);
  if (isNaN(limit) || limit < 1) limit = 100;
  if (limit > 500) limit = 500;
  const filterGnarly = searchParams.get("filterGnarly") !== "false";

  try {
    const data = await fetchPoidhBounties({ status, limit, filterGnarly });
    return NextResponse.json(data);
  } catch (error) {
    console.error("POIDH API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bounties" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Rewrite `src/app/api/poidh/bounty/[chainId]/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchPoidhBounty } from "@/services/poidh";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chainId: string; id: string }> },
) {
  const { chainId: chainIdStr, id: idStr } = await params;
  const chainId = parseInt(chainIdStr, 10);
  const id = parseInt(idStr, 10);

  if (isNaN(chainId) || isNaN(id) || id < 1) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    const bounty = await fetchPoidhBounty(chainId, id);

    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    return NextResponse.json({ bounty });
  } catch (error) {
    console.error("POIDH bounty API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bounty" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/api/poidh/bounties/route.ts src/app/api/poidh/bounty/\[chainId\]/\[id\]/route.ts
git commit -m "refactor(poidh): thin API routes to use service layer"
```

---

### Task 7: Final Verification

**Depends on:** All previous tasks

- [ ] **Step 1: Full build verification**

Run: `pnpm build 2>&1 | tail -30`
Expected: Build succeeds, both bounty pages appear as dynamic (ƒ) routes

- [ ] **Step 2: Verify SSR works for list page**

Run: `curl -s http://localhost:3000/community/bounties | grep -o '<title>[^<]*</title>' | head -1`
Expected: Returns the page title from layout metadata (not empty — proves SSR is working)

- [ ] **Step 3: Verify SSR works for detail page**

Run: `curl -s http://localhost:3000/community/bounties/8453/1091 | grep -o '<title>[^<]*</title>' | head -1`
Expected: Returns a bounty-specific title like "360 flip for Gnars — Gnars Challenges"

- [ ] **Step 4: Commit any remaining fixes**

If any issues were found and fixed, commit them.
