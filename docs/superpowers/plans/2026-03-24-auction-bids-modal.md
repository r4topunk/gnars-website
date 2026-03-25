# Auction Bids Modal with Calldata Comments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive modal showing all bids for the current auction with decoded on-chain comments from transaction calldata.

**Architecture:** Subgraph query fetches bids for the active auction. For each bid, the client fetches the raw transaction via RPC and decodes any UTF-8 comment appended after the `createBid` calldata. A responsive container uses Dialog (desktop) / Sheet-as-drawer (mobile) following the existing pattern in `map-location-drawer.tsx`. Polls every 10s while open, highlighting new bids.

**Tech Stack:** Next.js 15.5, React, Shadcn Dialog + Sheet, wagmi/viem, Builder DAO subgraph, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-24-auction-bids-modal-design.md`

---

### Task 1: Create `useAuctionBids` hook — subgraph query for bids by tokenId

**Files:**
- Create: `src/hooks/use-auction-bids.ts`

**Context:**
- Existing subgraph client: `src/lib/subgraph.ts` — exports `subgraphQuery<TData>(query, variables)`
- Existing bid query pattern: `src/services/feed-events.ts:104-129` — `BIDS_QUERY` filters by `auction_.dao`
- DAO address: `GNARS_ADDRESSES.token` from `src/lib/config.ts`
- This hook is client-side (uses `useState`/`useEffect`), not server-side cache

- [ ] **Step 1: Create the hook file with types and query**

```typescript
// src/hooks/use-auction-bids.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GNARS_ADDRESSES } from "@/lib/config";

const AUCTION_BIDS_QUERY = `
  query GetAuctionBids($daoAddress: String!, $tokenId: String!) {
    auctionBids(
      where: {
        auction_: { dao: $daoAddress, token_: { tokenId: $tokenId } }
      }
      orderBy: bidTime
      orderDirection: desc
      first: 100
    ) {
      id
      bidder
      amount
      bidTime
      transactionHash
    }
  }
`;

export interface AuctionBid {
  id: string;
  bidder: string;
  amount: string;
  bidTime: string;
  transactionHash: string;
}

interface UseAuctionBidsResult {
  bids: AuctionBid[];
  isLoading: boolean;
  error: string | null;
  newBidIds: Set<string>;
}

export function useAuctionBids(
  tokenId: string | undefined,
  enabled: boolean,
  pollIntervalMs = 10_000,
): UseAuctionBidsResult {
  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newBidIds, setNewBidIds] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());
  const isFirstFetch = useRef(true);

  const fetchBids = useCallback(async () => {
    if (!tokenId) return;

    try {
      if (isFirstFetch.current) setIsLoading(true);

      const { subgraphQuery } = await import("@/lib/subgraph");
      const data = await subgraphQuery<{ auctionBids: AuctionBid[] }>(
        AUCTION_BIDS_QUERY,
        {
          daoAddress: GNARS_ADDRESSES.token,
          tokenId,
        },
      );

      const fetched = data.auctionBids ?? [];
      setBids(fetched);

      // Track new bids (not on first load)
      if (!isFirstFetch.current) {
        const incoming = new Set<string>();
        for (const bid of fetched) {
          if (!knownIds.current.has(bid.id)) {
            incoming.add(bid.id);
          }
        }
        if (incoming.size > 0) {
          setNewBidIds(incoming);
          // Clear highlight after 3s
          setTimeout(() => setNewBidIds(new Set()), 3000);
        }
      }

      // Update known IDs
      knownIds.current = new Set(fetched.map((b) => b.id));
      isFirstFetch.current = false;
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bids");
    } finally {
      setIsLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    if (!enabled || !tokenId) return;

    isFirstFetch.current = true;
    knownIds.current = new Set();
    fetchBids();

    const interval = setInterval(fetchBids, pollIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, tokenId, fetchBids, pollIntervalMs]);

  return { bids, isLoading, error, newBidIds };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/hooks/use-auction-bids.ts 2>&1 | head -20`
Expected: No type errors (or only unrelated ones from other files)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-auction-bids.ts
git commit -m "feat(auction): add useAuctionBids hook for bid polling"
```

---

### Task 2: Create `useBidComments` hook — decode calldata comments via RPC

**Files:**
- Create: `src/hooks/use-bid-comments.ts`

**Context:**
- Comment encoding in `src/components/hero/AuctionSpotlight.tsx:141-156`:
  - `encodeFunctionData({ abi: auctionAbi, functionName: "createBid", args: [BigInt(tokenId)] })`
  - Comment bytes appended after standard calldata via `concat([baseCalldata, commentBytes])`
- Standard `createBid(uint256)` calldata = 4 bytes selector + 32 bytes param = 36 bytes = 72 hex chars + "0x" prefix = 74 chars
- RPC URL: `NEXT_PUBLIC_BASE_RPC_URL` env var, or use wagmi's configured transport
- Must handle: empty comments, invalid UTF-8, RPC errors gracefully
- Parallelize with `Promise.allSettled` and concurrency limit

- [ ] **Step 1: Create the hook file**

```typescript
// src/hooks/use-bid-comments.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const CALLDATA_PREFIX_LENGTH = 2 + 8 + 64; // "0x" + 4-byte selector + 32-byte arg

function decodeComment(input: string): string | null {
  if (!input || input.length <= CALLDATA_PREFIX_LENGTH) return null;

  const commentHex = input.slice(CALLDATA_PREFIX_LENGTH);
  if (commentHex.length === 0) return null;

  try {
    const bytes = new Uint8Array(
      commentHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return decoded.trim() || null;
  } catch {
    return null; // Invalid UTF-8
  }
}

const CONCURRENCY = 5;

async function fetchCommentsForHashes(
  txHashes: string[],
  existing: Map<string, string | null>,
): Promise<Map<string, string | null>> {
  const client = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"),
  });

  const toFetch = txHashes.filter((h) => !existing.has(h));
  if (toFetch.length === 0) return existing;

  const result = new Map(existing);

  // Batch in chunks of CONCURRENCY
  for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
    const chunk = toFetch.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      chunk.map(async (hash) => {
        const tx = await client.getTransaction({
          hash: hash as `0x${string}`,
        });
        return { hash, comment: decodeComment(tx.input) };
      }),
    );

    for (const res of settled) {
      if (res.status === "fulfilled") {
        result.set(res.value.hash, res.value.comment);
      } else {
        // RPC error — mark as null so we don't retry indefinitely
        const hash = chunk[settled.indexOf(res)];
        result.set(hash, null);
      }
    }
  }

  return result;
}

export function useBidComments(txHashes: string[]): {
  comments: Map<string, string | null>;
  isLoading: boolean;
} {
  const [comments, setComments] = useState<Map<string, string | null>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const commentsRef = useRef<Map<string, string | null>>(new Map());

  useEffect(() => {
    if (txHashes.length === 0) return;

    const newHashes = txHashes.filter((h) => !commentsRef.current.has(h));
    if (newHashes.length === 0) return;

    let cancelled = false;
    setIsLoading(true);

    fetchCommentsForHashes(txHashes, commentsRef.current).then((updated) => {
      if (cancelled) return;
      commentsRef.current = updated;
      setComments(new Map(updated));
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [txHashes.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { comments, isLoading };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/hooks/use-bid-comments.ts 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-bid-comments.ts
git commit -m "feat(auction): add useBidComments hook for calldata decoding"
```

---

### Task 3: Create `BidItem` component

**Files:**
- Create: `src/components/auction/BidItem.tsx`

**Context:**
- Uses `AddressDisplay` from `src/components/ui/address-display.tsx` — supports `variant="compact"`, `showAvatar`, `truncateLength`
- ENS resolution already handled inside `AddressDisplay` via `useENSOptimistic`
- Styling: dark theme, Tailwind CSS v4, follows existing card/feed patterns
- Comment display: left border accent (indigo), muted text
- New bid animation: `animate-in fade-in` with brief highlight

- [ ] **Step 1: Create the component**

```typescript
// src/components/auction/BidItem.tsx
"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { MessageSquare } from "lucide-react";
import { formatEther } from "viem";
import { AddressDisplay } from "@/components/ui/address-display";
import { cn } from "@/lib/utils";

interface BidItemProps {
  bidder: string;
  amount: string; // wei
  bidTime: number; // unix timestamp
  comment: string | null;
  isNew?: boolean;
}

function formatEth(weiStr: string): string {
  const eth = formatEther(BigInt(weiStr));
  const num = parseFloat(eth);
  return num.toFixed(num < 0.01 ? 5 : 4);
}

export function BidItem({ bidder, amount, bidTime, comment, isNew }: BidItemProps) {
  const timeAgo = formatDistanceToNowStrict(new Date(bidTime * 1000), { addSuffix: true });

  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 bg-muted/30 p-3 transition-all",
        isNew && "animate-in fade-in slide-in-from-top-2 duration-500 ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <AddressDisplay
          address={bidder}
          variant="compact"
          showAvatar={true}
          avatarSize="xs"
          showCopy={false}
          showExplorer={false}
          truncateLength={4}
        />
        <span className="text-sm font-bold text-green-500 tabular-nums">
          {formatEth(amount)} ETH
        </span>
      </div>

      {comment && (
        <div className="mt-2 flex items-start gap-1.5">
          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-indigo-400" />
          <p className="rounded border-l-2 border-indigo-500/50 bg-indigo-500/5 px-2 py-1 text-xs text-indigo-300">
            {comment.length > 140 ? `${comment.slice(0, 140)}…` : comment}
          </p>
        </div>
      )}

      <div className="mt-1.5 text-right text-[10px] text-muted-foreground">
        {timeAgo}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/components/auction/BidItem.tsx 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/auction/BidItem.tsx
git commit -m "feat(auction): add BidItem component with comment display"
```

---

### Task 4: Create `BidHistoryModal` — responsive Dialog/Sheet container

**Files:**
- Create: `src/components/auction/BidHistoryModal.tsx`

**Context:**
- No Vaul/Drawer installed. Use existing `Dialog` (desktop) + `Sheet` (mobile) pattern.
- Existing pattern in `src/components/map-location-drawer.tsx:37-39`: manual `isMobile` via `window.innerWidth` + resize listener
- Dialog: `src/components/ui/dialog.tsx` — Radix-based, centered, zoom animation
- Sheet: `src/components/ui/sheet.tsx` — slide-out panel, supports `side="bottom"`
- Scroll area: `src/components/ui/scroll-area.tsx`
- Skeleton: `src/components/ui/skeleton.tsx`

- [ ] **Step 1: Create the modal component**

```typescript
// src/components/auction/BidHistoryModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuctionBids } from "@/hooks/use-auction-bids";
import { useBidComments } from "@/hooks/use-bid-comments";
import { BidItem } from "./BidItem";

interface BidHistoryModalProps {
  tokenId: string | undefined;
  tokenName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

function BidListContent({
  tokenId,
  enabled,
}: {
  tokenId: string | undefined;
  enabled: boolean;
}) {
  const { bids, isLoading, error, newBidIds } = useAuctionBids(tokenId, enabled);
  const txHashes = useMemo(() => bids.map((b) => b.transactionHash), [bids]);
  const { comments, isLoading: commentsLoading } = useBidComments(txHashes);

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Failed to load bids
      </p>
    );
  }

  if (bids.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No bids yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {bids.map((bid) => (
        <BidItem
          key={bid.id}
          bidder={bid.bidder}
          amount={bid.amount}
          bidTime={Number(bid.bidTime)}
          comment={comments.get(bid.transactionHash) ?? null}
          isNew={newBidIds.has(bid.id)}
        />
      ))}
    </div>
  );
}

export function BidHistoryModal({
  tokenId,
  tokenName,
  open,
  onOpenChange,
}: BidHistoryModalProps) {
  const isMobile = useIsMobile();
  const title = tokenName
    ? `Bids for ${tokenName.replace("Gnars", "Gnar")}`
    : tokenId
      ? `Bids for Gnar #${tokenId}`
      : "Bid History";

  const content = (
    <ScrollArea className="max-h-[60vh] pr-2">
      <BidListContent tokenId={tokenId} enabled={open} />
    </ScrollArea>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-xl">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className="sr-only">
              List of bids for the current auction
            </SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            List of bids for the current auction
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/components/auction/BidHistoryModal.tsx 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/components/auction/BidHistoryModal.tsx
git commit -m "feat(auction): add BidHistoryModal responsive container"
```

---

### Task 5: Integrate trigger into AuctionSpotlight

**Files:**
- Modify: `src/components/hero/AuctionSpotlight.tsx`

**Context:**
- The trigger goes near line 373-386, after the highest bidder display
- Add a "View X bids" link that opens the modal
- Need to add state for modal open/close
- Import `BidHistoryModal`
- The `tokenId` and `tokenUri?.name` are already available in scope

- [ ] **Step 1: Add imports and state to AuctionSpotlight**

At the top of the file, add import:
```typescript
import { BidHistoryModal } from "@/components/auction/BidHistoryModal";
```

After the existing `useState` declarations (~line 38), add:
```typescript
const [isBidHistoryOpen, setIsBidHistoryOpen] = useState(false);
```

- [ ] **Step 2: Add the trigger link and modal to the JSX**

After the highest bidder block (after line 386, before the closing `</div>` tags), add the "View bids" link:

Find the block:
```tsx
{highestBidder && highestBidder !== zeroAddress && (
  <div className="text-center text-xs text-muted-foreground">
    <span className="mr-1">{isLive ? "Leading bidder:" : "Winner:"}</span>
    <AddressDisplay ... />
  </div>
)}
```

After it, add:
```tsx
<button
  type="button"
  onClick={() => setIsBidHistoryOpen(true)}
  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
>
  View bids
</button>

{/* Note: bid count can be added here once useAuctionBids is available
    by lifting the hook or using a lightweight count query */}

<BidHistoryModal
  tokenId={tokenId?.toString()}
  tokenName={tokenUri?.name}
  open={isBidHistoryOpen}
  onOpenChange={setIsBidHistoryOpen}
/>
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit src/components/hero/AuctionSpotlight.tsx 2>&1 | head -20`

- [ ] **Step 4: Manual test**

Run: `pnpm dev`
1. Open homepage
2. Verify "View bids" link appears below the bidder info
3. Click it — modal opens on desktop, bottom sheet on mobile
4. Verify bids load with comments decoded
5. Wait 10s — verify poll works
6. Close modal — verify cleanup

- [ ] **Step 5: Commit**

```bash
git add src/components/hero/AuctionSpotlight.tsx
git commit -m "feat(auction): integrate bid history modal into AuctionSpotlight"
```

---

### Task 6: Polish and edge cases

**Files:**
- Modify: `src/components/auction/BidHistoryModal.tsx` (if needed)
- Modify: `src/components/auction/BidItem.tsx` (if needed)
- Modify: `src/hooks/use-bid-comments.ts` (if needed)

- [ ] **Step 1: Test edge cases**

1. Auction with 0 bids → "No bids yet" message
2. Bid without comment → no comment block shown
3. Bid with comment → indigo comment block with MessageSquare icon
4. Multiple rapid bids → new bid highlight works
5. Mobile viewport → bottom sheet with scroll
6. Close and reopen → fresh load, no stale highlights

- [ ] **Step 2: Fix any issues found during testing**

Address any bugs, layout issues, or edge cases discovered.

- [ ] **Step 3: Final commit**

```bash
git add -u
git commit -m "fix(auction): polish bid history modal edge cases"
```
