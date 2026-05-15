# Vote Card Delegation Breakdown Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a voter's own tokens vs. delegated votes as inline tags on each Individual Vote card, with a lazy-fetched tooltip listing each delegator.

**Architecture:** New API route wraps `fetchDelegatorsWithCounts`. New `DelegationTooltip` client component fetches on first hover, caches in a `useRef` map passed from `ProposalVotesList`. Tags only render if delegation exists; cards without delegation are unchanged.

**Tech Stack:** Next.js 15 App Router, React, shadcn/ui `<Tooltip>`, Tailwind CSS, `DelegatorWithCount` from `@/services/members`.

---

## Chunk 1: API Route

### Task 1: Create `/api/delegators/[address]` route

**Files:**

- Create: `src/app/api/delegators/[address]/route.ts`

- [ ] **Step 1: Create the API route**

```ts
// src/app/api/delegators/[address]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchDelegatorsWithCounts } from "@/services/members";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  try {
    const delegators = await fetchDelegatorsWithCounts(address);
    return NextResponse.json(delegators);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to fetch delegators:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify route resolves**

```bash
pnpm dev
# In another terminal:
curl "http://localhost:3000/api/delegators/0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17"
# Expected: JSON array (may be empty [], that's fine)
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/delegators/[address]/route.ts
git commit -m "feat: add /api/delegators/[address] route"
```

---

## Chunk 2: DelegationTooltip Component

### Task 2: Create `DelegationTooltip`

**Files:**

- Create: `src/components/proposals/detail/DelegationTooltip.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/proposals/detail/DelegationTooltip.tsx
"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DelegatorWithCount } from "@/services/members";

interface DelegationTooltipProps {
  voterAddress: string;
  totalVotes: number;
  cache: React.MutableRefObject<Map<string, DelegatorWithCount[]>>;
}

export function DelegationTooltip({ voterAddress, totalVotes, cache }: DelegationTooltipProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [delegators, setDelegators] = useState<DelegatorWithCount[]>([]);

  const handleOpen = useCallback(
    async (open: boolean) => {
      if (!open || status !== "idle") return;

      const key = voterAddress.toLowerCase();
      const cached = cache.current.get(key);
      if (cached !== undefined) {
        setDelegators(cached);
        setStatus("done");
        return;
      }

      setStatus("loading");
      try {
        const res = await fetch(`/api/delegators/${voterAddress}`);
        if (!res.ok) throw new Error("fetch failed");
        const data: DelegatorWithCount[] = await res.json();
        // Filter out self-delegation artifacts (voter delegating to themselves)
        const filtered = data.filter((d) => d.owner.toLowerCase() !== key);
        cache.current.set(key, filtered);
        setDelegators(filtered);
        setStatus("done");
      } catch {
        setStatus("error");
      }
    },
    [voterAddress, cache, status],
  );

  // Hide only when fetch confirms no delegators (card unchanged per spec)
  if (status === "done" && delegators.length === 0) return null;

  const delegatedSum = delegators.reduce((acc, d) => acc + d.tokenCount, 0);
  // ownVotes only known after fetch; null while idle/loading
  const ownVotes = status === "done" ? totalVotes - delegatedSum : null;

  return (
    <span className="flex items-center gap-1">
      {ownVotes !== null && (
        <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded">
          {ownVotes} own
        </span>
      )}
      <Tooltip onOpenChange={handleOpen}>
        <TooltipTrigger asChild>
          <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded border border-border cursor-pointer select-none">
            {status === "done" ? `${delegatedSum} delegated` : "delegated"}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-0 overflow-hidden min-w-[160px]">
          {status === "loading" && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs">
              <Loader2 className="size-3 animate-spin" />
              <span>Loading…</span>
            </div>
          )}
          {status === "error" && <div className="px-3 py-2 text-xs opacity-70">Could not load</div>}
          {status === "done" && (
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-2">
                Delegated from
              </p>
              <div className="space-y-1">
                {delegators.map((d) => (
                  <div key={d.owner} className="flex justify-between gap-6 text-xs">
                    <span className="opacity-80 font-mono">
                      {d.owner.slice(0, 6)}…{d.owner.slice(-4)}
                    </span>
                    <span className="font-semibold">{d.tokenCount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
# Expected: no errors in DelegationTooltip.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/proposals/detail/DelegationTooltip.tsx
git commit -m "feat: add DelegationTooltip component"
```

---

## Chunk 3: Wire into ProposalVotesList

### Task 3: Integrate `DelegationTooltip` into vote cards

**Files:**

- Modify: `src/components/proposals/detail/ProposalVotesList.tsx`

- [ ] **Step 1: Add imports and cache ref**

Modify the existing React import (line 4 — merge `useRef` in, do NOT add a second import from "react"):

```tsx
// Before:
// After:
import { useRef, useState, useState } from "react";
```

Add after the existing imports block:

```tsx
import type { DelegatorWithCount } from "@/services/members";
import { DelegationTooltip } from "./DelegationTooltip";
```

Add inside the `ProposalVotesList` function body, after the existing `useState` calls:

```tsx
// Shared cache for delegation data — avoids refetching on repeated hovers
const delegationCache = useRef<Map<string, DelegatorWithCount[]>>(new Map());
```

- [ ] **Step 2: Insert `DelegationTooltip` into the vote card**

Find this block in the JSX (around line 91-99):

```tsx
                    <span>
                      with <b>{Number(vote.votes).toLocaleString()}</b> vote
                      {Number(vote.votes) === 1 ? "" : "s"}
                    </span>
                    {vote.timestamp ? (
```

Replace with:

```tsx
                    <span>
                      with <b>{Number(vote.votes).toLocaleString()}</b> vote
                      {Number(vote.votes) === 1 ? "" : "s"}
                    </span>
                    <DelegationTooltip
                      voterAddress={vote.voter}
                      totalVotes={Number(vote.votes)}
                      cache={delegationCache}
                    />
                    {vote.timestamp ? (
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
# Expected: no errors
```

- [ ] **Step 4: Smoke test in browser**

```bash
pnpm dev
# Navigate to any proposal with votes, e.g. /proposals/1
# Expected:
#   - All vote cards show "delegated" tag initially
#   - Hovering a card's tag shows a spinner, then either:
#     a) disappears (no delegators found)
#     b) shows "N own" + "M delegated" tags + tooltip with delegator list
#   - Cards with no delegation: tag disappears after first hover
#   - Hovering the same tag again shows list instantly (cache hit)
```

- [ ] **Step 5: Commit and push**

```bash
git add src/components/proposals/detail/ProposalVotesList.tsx
git commit -m "feat: show own vs delegated vote breakdown on proposal vote cards"
git push
```
