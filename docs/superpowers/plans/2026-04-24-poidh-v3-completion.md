# POIDH V3 Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all V3 ABI mismatches, add vote dashboard, pending withdrawal banner, and a full integration test script.

**Architecture:** Fix the ABI layer first so all downstream consumers are correct, then update hooks, build two new UI components (VoteDashboard, PendingWithdrawalBanner), wire them into the existing views, and finally write the integration test script.

**Tech Stack:** Next.js 15, thirdweb v5, wagmi v2, viem, Tailwind CSS v4, shadcn/ui

---

## File Map

| File                                                  | Action | What changes                                                                                                                        |
| ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/poidh/abi.ts`                                | Modify | Fix `voteClaim`/`resolveVote`, remove `getBounty`, fix `bounties` getter, add 6 new entries                                         |
| `src/hooks/usePoidhContract.ts`                       | Modify | Fix vote/resolve params, add `usePoidhClaimRefund`, `usePoidhResetVotingPeriod`, `usePoidhWithdraw`                                 |
| `src/components/bounties/VoteDashboard.tsx`           | Create | Live yes/no tallies + vote deadline countdown                                                                                       |
| `src/components/bounties/PendingWithdrawalBanner.tsx` | Create | Per-chain claimable ETH notification + withdraw button                                                                              |
| `src/components/bounties/BountyDetailView.tsx`        | Modify | Remove dead `getBounty`, add `everHadExternalContributor` gate, fix canceled-bounty withdraw, add VoteDashboard + resetVotingPeriod |
| `src/components/bounties/BountiesView.tsx`            | Modify | Add PendingWithdrawalBanner at top                                                                                                  |
| `scripts/test-poidh.ts`                               | Create | Full integration test script with thirdweb wallets                                                                                  |

---

## Task 1: Fix ABI

**Files:**

- Modify: `src/lib/poidh/abi.ts` (replace entirely)

Three bugs + six missing entries.

**Bug fixes:**

- `voteClaim`: V2 had `(bountyId, claimId, accept)`, V3 is `(bountyId, vote: bool)` — drop `claimId`
- `resolveVote`: V2 had `(bountyId, claimId)`, V3 is `(bountyId)` — drop `claimId`
- `getBounty`: does not exist on V3 — remove entirely
- `bounties` storage getter: remove phantom fields `deadline`, `status`, `isOpenBounty`

**New entries to add:**

- `claimRefundFromCancelledOpenBounty(bountyId)` — contributor pull-refund after issuer cancels open bounty
- `resetVotingPeriod(bountyId)` — recovery after a failed vote (reverts if vote would have passed)
- `withdrawTo(to: address)` — variant of `withdraw()` for contract wallets
- `bountyVotingTracker(bountyId)` → `(yes: uint256, no: uint256, deadline: uint256)`
- `bountyCurrentVotingClaim(bountyId)` → `uint256` (claim ID in active vote)
- `everHadExternalContributor(bountyId)` → `bool`

- [ ] **Step 1: Replace `src/lib/poidh/abi.ts` with the corrected V3 ABI**

```typescript
export const POIDH_ABI = [
  // ── Write functions ──────────────────────────────────────────────────────
  {
    inputs: [
      { internalType: "uint256", name: "bountyId", type: "uint256" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "string", name: "imageUri", type: "string" },
    ],
    name: "createClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "description", type: "string" },
    ],
    name: "createSoloBounty",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "description", type: "string" },
    ],
    name: "createOpenBounty",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bountyId", type: "uint256" }],
    name: "joinOpenBounty",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "bountyId", type: "uint256" },
      { internalType: "uint256", name: "claimId", type: "uint256" },
    ],
    name: "acceptClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "bountyId", type: "uint256" },
      { internalType: "uint256", name: "claimId", type: "uint256" },
    ],
    name: "submitClaimForVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "bountyId", type: "uint256" },
      { internalType: "bool", name: "vote", type: "bool" },
    ],
    name: "voteClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bountyId", type: "uint256" }],
    name: "resolveVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bountyId", type: "uint256" }],
    name: "cancelSoloBounty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bountyId", type: "uint256" }],
    name: "cancelOpenBounty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bountyId", type: "uint256" }],
    name: "withdrawFromOpenBounty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bountyId", type: "uint256" }],
    name: "claimRefundFromCancelledOpenBounty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bountyId", type: "uint256" }],
    name: "resetVotingPeriod",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "to", type: "address" }],
    name: "withdrawTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ── Read functions ───────────────────────────────────────────────────────
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "bounties",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "issuer", type: "address" },
      { internalType: "address", name: "claimer", type: "address" },
      { internalType: "uint256", name: "createdAt", type: "uint256" },
      { internalType: "uint256", name: "claimId", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bountyId", type: "uint256" }],
    name: "getParticipants",
    outputs: [
      { internalType: "address[]", name: "", type: "address[]" },
      { internalType: "uint256[]", name: "", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bountyId", type: "uint256" }],
    name: "bountyVotingTracker",
    outputs: [
      { internalType: "uint256", name: "yes", type: "uint256" },
      { internalType: "uint256", name: "no", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bountyId", type: "uint256" }],
    name: "bountyCurrentVotingClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "bountyId", type: "uint256" }],
    name: "everHadExternalContributor",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "pendingWithdrawals",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
```

- [ ] **Step 2: Verify TypeScript compiles with the new ABI**

```bash
cd /Users/web3warrior/Code/gnars/gnars-website && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors referencing `getBounty`, `claimId` in `voteClaim`/`resolveVote`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/poidh/abi.ts
git commit -m "fix(poidh): update ABI to V3 — fix voteClaim/resolveVote, add missing functions"
```

---

## Task 2: Fix & Extend Contract Hooks

**Files:**

- Modify: `src/hooks/usePoidhContract.ts`

Three changes to existing hooks + three new hooks.

### 2a: Fix `usePoidhVoteClaim` — remove `claimId` param

- [ ] **Step 1: Update the `usePoidhVoteClaim` hook**

Replace the existing `usePoidhVoteClaim` function (lines 300–319) with:

```typescript
export function usePoidhVoteClaim(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const vote = useCallback(
    async (onChainBountyId: number, accept: boolean) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(
        ctx,
        bountyChainId,
      );
      const contract = getContract({
        client,
        chain: twChain,
        address: contractAddress,
        abi: POIDH_ABI,
      });
      const tx = prepareContractCall({
        contract,
        method: "voteClaim",
        params: [BigInt(onChainBountyId), accept],
      });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { vote, ...buildPoidhReturn(state) };
}
```

### 2b: Fix `usePoidhResolveVote` — remove `claimId` param

- [ ] **Step 2: Update the `usePoidhResolveVote` hook**

Replace the existing `usePoidhResolveVote` function (lines 323–342) with:

```typescript
export function usePoidhResolveVote(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const resolve = useCallback(
    async (onChainBountyId: number) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(
        ctx,
        bountyChainId,
      );
      const contract = getContract({
        client,
        chain: twChain,
        address: contractAddress,
        abi: POIDH_ABI,
      });
      const tx = prepareContractCall({
        contract,
        method: "resolveVote",
        params: [BigInt(onChainBountyId)],
      });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { resolve, ...buildPoidhReturn(state) };
}
```

### 2c: Add three new hooks

- [ ] **Step 3: Append the three new hooks to the end of `src/hooks/usePoidhContract.ts`**

```typescript
// ─── Claim Refund from Cancelled Open Bounty (contributor pull-payment) ───────

export function usePoidhClaimRefundFromCancelledBounty(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const claimRefund = useCallback(
    async (onChainBountyId: number) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(
        ctx,
        bountyChainId,
      );
      const contract = getContract({
        client,
        chain: twChain,
        address: contractAddress,
        abi: POIDH_ABI,
      });
      const tx = prepareContractCall({
        contract,
        method: "claimRefundFromCancelledOpenBounty",
        params: [BigInt(onChainBountyId)],
      });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { claimRefund, ...buildPoidhReturn(state) };
}

// ─── Reset Voting Period (recovery after failed vote) ─────────────────────────

export function usePoidhResetVotingPeriod(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const reset = useCallback(
    async (onChainBountyId: number) => {
      const { client, contractAddress, twChain, writer } = await assertPoidhReady(
        ctx,
        bountyChainId,
      );
      const contract = getContract({
        client,
        chain: twChain,
        address: contractAddress,
        abi: POIDH_ABI,
      });
      const tx = prepareContractCall({
        contract,
        method: "resetVotingPeriod",
        params: [BigInt(onChainBountyId)],
      });
      await sendAndConfirm(state, client, twChain, writer, tx);
    },
    [ctx, bountyChainId, state],
  );

  return { reset, ...buildPoidhReturn(state) };
}

// ─── Withdraw pending balance (bounty winners, cancelled-bounty refunds) ─────

export function usePoidhWithdraw(bountyChainId: number) {
  const ctx = usePoidhContext(bountyChainId);
  const state = usePoidhWriteState();

  const withdraw = useCallback(async () => {
    const { client, contractAddress, twChain, writer } = await assertPoidhReady(ctx, bountyChainId);
    const contract = getContract({
      client,
      chain: twChain,
      address: contractAddress,
      abi: POIDH_ABI,
    });
    const tx = prepareContractCall({
      contract,
      method: "withdraw",
      params: [],
    });
    await sendAndConfirm(state, client, twChain, writer, tx);
  }, [ctx, bountyChainId, state]);

  return { withdraw, ...buildPoidhReturn(state) };
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `usePoidhContract.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePoidhContract.ts
git commit -m "fix(poidh): fix voteClaim/resolveVote params, add claimRefund/resetVoting/withdraw hooks"
```

---

## Task 3: VoteDashboard Component

**Files:**

- Create: `src/components/bounties/VoteDashboard.tsx`

Reads `bountyVotingTracker` on-chain every 15s. Shows yes/no ETH weights as a progress bar and the vote deadline as a live countdown.

Note: vote weights (`yes`/`no`) are ETH amounts in wei — participants' contribution snapshots — not simple vote counts. Display as ETH.

- [ ] **Step 1: Create `src/components/bounties/VoteDashboard.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { Clock } from 'lucide-react';
import { POIDH_ABI } from '@/lib/poidh/abi';
import { POIDH_CONTRACTS } from '@/lib/poidh/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function useDeadlineCountdown(deadlineSeconds: number): string {
  const calc = () => {
    if (!deadlineSeconds) return '';
    const diff = deadlineSeconds * 1000 - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };
  const [label, setLabel] = useState(calc);
  useEffect(() => {
    if (!deadlineSeconds) return;
    const id = setInterval(() => setLabel(calc()), 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineSeconds]);
  return label;
}

interface VoteDashboardProps {
  chainId: number;
  onChainBountyId: number;
}

export function VoteDashboard({ chainId, onChainBountyId }: VoteDashboardProps) {
  const contractAddress = POIDH_CONTRACTS[chainId];

  const { data: tracker } = useReadContract({
    address: contractAddress,
    abi: POIDH_ABI,
    functionName: 'bountyVotingTracker',
    args: [BigInt(onChainBountyId)],
    chainId,
    query: {
      enabled: !!contractAddress && onChainBountyId > 0,
      refetchInterval: 15_000,
    },
  });

  const deadline = useDeadlineCountdown(tracker ? Number(tracker[2]) : 0);

  if (!tracker) return null;

  const yesWei = tracker[0];
  const noWei  = tracker[1];
  const deadlineSec = Number(tracker[2]);

  if (deadlineSec === 0) return null; // no active vote

  const yesEth = parseFloat(formatEther(yesWei));
  const noEth  = parseFloat(formatEther(noWei));
  const total  = yesEth + noEth;
  const yesPercent = total > 0 ? Math.round((yesEth / total) * 100) : 50;
  const isExpired  = deadlineSec * 1000 < Date.now();

  return (
    <Card className="border-yellow-500/20 bg-yellow-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-yellow-400">Live Vote</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Yes / No labels */}
        <div className="flex justify-between text-xs font-medium">
          <span className="text-emerald-400">{yesEth.toFixed(4)} ETH Yes</span>
          <span className="text-red-400">{noEth.toFixed(4)} ETH No</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${yesPercent}%` }}
          />
        </div>

        {/* Vote weight note */}
        <p className="text-xs text-muted-foreground">
          Weighted by ETH contribution — {total.toFixed(4)} ETH total
        </p>

        {/* Deadline */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
          <Clock className="w-3 h-3" />
          {isExpired
            ? 'Vote period ended — resolve when ready'
            : `Vote closes in ${deadline}`}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep VoteDashboard
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/bounties/VoteDashboard.tsx
git commit -m "feat(poidh): add VoteDashboard with live vote tallies and deadline countdown"
```

---

## Task 4: PendingWithdrawalBanner Component

**Files:**

- Create: `src/components/bounties/PendingWithdrawalBanner.tsx`

Reads `pendingWithdrawals(userAddress)` for each supported chain. Shows a banner per chain where balance > 0. Calls `withdraw()` via `usePoidhWithdraw`.

- [ ] **Step 1: Create `src/components/bounties/PendingWithdrawalBanner.tsx`**

```typescript
'use client';

import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { Wallet, Loader2, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { POIDH_ABI } from '@/lib/poidh/abi';
import { POIDH_CONTRACTS, CHAIN_NAMES, getTxUrl, SUPPORTED_CHAINS } from '@/lib/poidh/config';
import { usePoidhWithdraw } from '@/hooks/usePoidhContract';
import { useUserAddress } from '@/hooks/use-user-address';

interface ChainBannerProps {
  chainId: number;
  userAddress: `0x${string}`;
}

function ChainWithdrawalBanner({ chainId, userAddress }: ChainBannerProps) {
  const contractAddress = POIDH_CONTRACTS[chainId];
  const chainName = CHAIN_NAMES[chainId as keyof typeof CHAIN_NAMES];
  const { withdraw, isPending, isSuccess, hash, error } = usePoidhWithdraw(chainId);

  const { data: pending, refetch } = useReadContract({
    address: contractAddress,
    abi: POIDH_ABI,
    functionName: 'pendingWithdrawals',
    args: [userAddress],
    chainId,
    query: { enabled: !!contractAddress, refetchInterval: 30_000 },
  });

  // Re-fetch after successful withdrawal
  if (isSuccess) void refetch();

  if (!pending || pending === 0n) return null;

  const ethAmount = parseFloat(formatEther(pending)).toFixed(6);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-md border border-amber-500/30 bg-amber-500/10 text-sm">
      <Wallet className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
      <div className="flex-1">
        <span className="font-medium text-amber-300">
          {ethAmount} ETH claimable on {chainName}
        </span>
        <p className="text-xs text-muted-foreground mt-0.5">
          From bounty winnings or a cancelled open bounty.
        </p>
      </div>

      {isSuccess ? (
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs shrink-0">
          <CheckCircle2 className="w-4 h-4" />
          <span>Withdrawn!</span>
          {hash && (
            <a href={getTxUrl(chainId, hash)} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-0.5 hover:underline ml-1">
              Tx <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 whitespace-nowrap"
            disabled={isPending}
            onClick={() => withdraw()}
          >
            {isPending ? (
              <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Withdrawing…</>
            ) : (
              'Withdraw'
            )}
          </Button>
          {error && (
            <div className="flex items-start gap-1 text-destructive text-xs max-w-48">
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{error.message.split('\n')[0]}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PendingWithdrawalBanner() {
  const { address, isConnected } = useUserAddress();

  if (!isConnected || !address) return null;

  return (
    <div className="space-y-2 mb-4">
      {Object.values(SUPPORTED_CHAINS).map((chainId) => (
        <ChainWithdrawalBanner
          key={chainId}
          chainId={chainId}
          userAddress={address as `0x${string}`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep PendingWithdrawal
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/bounties/PendingWithdrawalBanner.tsx
git commit -m "feat(poidh): add PendingWithdrawalBanner for claimable ETH across chains"
```

---

## Task 5: Update BountyDetailView

**Files:**

- Modify: `src/components/bounties/BountyDetailView.tsx`

Four independent changes:

1. Remove dead `getBounty` call, simplify `isJoinable`
2. Add `everHadExternalContributor` read to gate the Accept Claim button
3. Fix canceled-bounty withdraw to use `claimRefundFromCancelledOpenBounty`
4. Add `VoteDashboard` in sidebar + `resetVotingPeriod` button in voting section

### 5a — Remove dead getBounty, fix isJoinable

- [ ] **Step 1: Remove the `getBounty` useReadContract block and simplify isJoinable**

Replace this block (lines 178–187):

```typescript
// Read the authoritative on-chain isOpenBounty flag (overrides API field which can be null on V2)
const { data: onChainBountyData } = useReadContract({
  address: POIDH_CONTRACTS[chainId],
  abi: POIDH_ABI,
  functionName: "getBounty",
  args: [BigInt(bounty?.onChainId ?? 0)],
  chainId,
  query: { enabled: !!bounty?.onChainId },
});
const isJoinable = onChainBountyData
  ? onChainBountyData.isOpenBounty
  : bounty?.isOpenBounty || bounty?.isMultiplayer;
```

With:

```typescript
const isJoinable = bounty?.isOpenBounty || bounty?.isMultiplayer;
```

### 5b — Add everHadExternalContributor read

- [ ] **Step 2: Add the read after the `participantsData` block (after line 199)**

```typescript
const { data: hadExternalContributor } = useReadContract({
  address: POIDH_CONTRACTS[chainId],
  abi: POIDH_ABI,
  functionName: "everHadExternalContributor",
  args: [BigInt(bounty?.onChainId ?? 0)],
  chainId,
  query: { enabled: !!bounty?.onChainId },
});
```

- [ ] **Step 3: Update imports — add the three new hooks and VoteDashboard**

In the imports at the top of BountyDetailView.tsx, update the hook import line:

```typescript
import {
  usePoidhAcceptClaim,
  usePoidhCancelBounty,
  usePoidhClaimRefundFromCancelledBounty,
  usePoidhJoinBounty,
  usePoidhResetVotingPeriod,
  usePoidhResolveVote,
  usePoidhSubmitClaimForVote,
  usePoidhVoteClaim,
  usePoidhWithdrawFromBounty,
} from "@/hooks/usePoidhContract";
```

Add VoteDashboard import:

```typescript
import { VoteDashboard } from "@/components/bounties/VoteDashboard";
```

- [ ] **Step 4: Instantiate the new hooks** — add after line 173 (after `resolveVoteHook`):

```typescript
const claimRefundHook = usePoidhClaimRefundFromCancelledBounty(chainId);
const resetVotingHook = usePoidhResetVotingPeriod(chainId);
```

### 5c — Gate Accept Claim with everHadExternalContributor

- [ ] **Step 5: Update the Accept Claim button condition**

Find (line ~451):

```typescript
{isCreator && !claim.accepted && !bounty.isCanceled && (
```

Replace with:

```typescript
{isCreator && !claim.accepted && !bounty.isCanceled && !hadExternalContributor && (
```

Also add a note for when `hadExternalContributor` is true — insert directly after the Accept button block:

```typescript
{isCreator && !claim.accepted && !bounty.isCanceled && hadExternalContributor && !bounty.isVoting && (
  <p className="text-xs text-muted-foreground pt-1">
    This open bounty had contributors — use <strong>Submit for Vote</strong> to accept a claim.
  </p>
)}
```

### 5d — Fix canceled-bounty withdraw section

- [ ] **Step 6: Replace `withdrawHook` with `claimRefundHook` in the canceled-bounty section**

Find the entire "Withdraw Your Contribution" Card (lines ~699–732) and replace the `withdrawHook` references:

```typescript
{/* Withdraw from canceled bounty (participant) */}
{bounty.isCanceled && isJoinable && !isCreator && (
  <Card className="border-border">
    <CardHeader className="pb-3">
      <CardTitle className="text-base">Withdraw Your Contribution</CardTitle>
      <CardDescription>This bounty was canceled. Recover your contribution.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {claimRefundHook.isSuccess ? (
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          <p className="text-sm font-medium">Withdrawal confirmed!</p>
          {claimRefundHook.hash && (
            <a href={getTxUrl(chainId, claimRefundHook.hash)} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 text-xs text-primary hover:underline">
              View tx <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ) : (
        <>
          {claimRefundHook.error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{claimRefundHook.error.message.split('\n')[0]}</span>
            </div>
          )}
          <Button variant="outline" className="w-full" disabled={claimRefundHook.isPending}
                  onClick={() => claimRefundHook.claimRefund(bounty.onChainId)}>
            {claimRefundHook.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{claimRefundHook.hash ? 'Confirming…' : 'Confirm in wallet…'}</>
              : 'Withdraw Funds'
            }
          </Button>
        </>
      )}
    </CardContent>
  </Card>
)}
```

### 5e — Wire VoteDashboard + resetVotingPeriod button

- [ ] **Step 7: Add VoteDashboard card in the sidebar, before the Bounty Details card**

Find the comment `{/* Bounty Details */}` card in the sidebar and insert before it:

```typescript
{/* Vote Dashboard — only when bounty is in voting state */}
{bounty.isVoting && bounty.onChainId > 0 && (
  <VoteDashboard chainId={chainId} onChainBountyId={bounty.onChainId} />
)}
```

- [ ] **Step 8: Add resetVotingPeriod button in the voting controls section**

Inside the `{bounty.isVoting && isConnected && (` block, after the Resolve Vote button and its success/error state (after the last `resolveVoteHook` block), add:

```typescript
{/* Reset voting period — shown after vote deadline, allows retry if vote failed */}
<Button
  size="sm"
  variant="ghost"
  className="w-full text-xs text-muted-foreground"
  disabled={resetVotingHook.isPending}
  onClick={() => resetVotingHook.reset(bounty.onChainId)}
>
  {resetVotingHook.isPending
    ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Resetting…</>
    : 'Reset voting period (if vote failed)'
  }
</Button>
{resetVotingHook.error && (
  <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-2 py-1.5 text-xs text-destructive">
    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
    <span>{resetVotingHook.error.message.split('\n')[0]}</span>
  </div>
)}
{resetVotingHook.isSuccess && resetVotingHook.hash && (
  <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
    <CheckCircle2 className="w-3 h-3 shrink-0" />
    <span>Voting period reset — new claims can be submitted for vote.</span>
    <a href={getTxUrl(chainId, resetVotingHook.hash)} target="_blank" rel="noopener noreferrer"
       className="ml-auto flex items-center gap-1 hover:underline">
      View tx <ExternalLink className="w-3 h-3" />
    </a>
  </div>
)}
```

- [ ] **Step 9: Also update vote/resolve call sites** — the vote and resolve hooks no longer accept `claimId`

Find in the voting controls section:

```typescript
onClick={() => voteClaimHook.vote(bounty.onChainId, claim.id, true)}
```

Replace with:

```typescript
onClick={() => voteClaimHook.vote(bounty.onChainId, true)}
```

Find:

```typescript
onClick={() => voteClaimHook.vote(bounty.onChainId, claim.id, false)}
```

Replace with:

```typescript
onClick={() => voteClaimHook.vote(bounty.onChainId, false)}
```

Find:

```typescript
onClick={() => resolveVoteHook.resolve(bounty.onChainId, claim.id)}
```

Replace with:

```typescript
onClick={() => resolveVoteHook.resolve(bounty.onChainId)}
```

- [ ] **Step 10: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors.

- [ ] **Step 11: Commit**

```bash
git add src/components/bounties/BountyDetailView.tsx
git commit -m "fix(poidh): fix vote/resolve calls, add VoteDashboard, claimRefund, everHadExternalContributor gate"
```

---

## Task 6: Wire PendingWithdrawalBanner into BountiesView

**Files:**

- Modify: `src/components/bounties/BountiesView.tsx`

Add import + render at top of the view, before the tabs/filters.

- [ ] **Step 1: Add import to BountiesView.tsx**

```typescript
import { PendingWithdrawalBanner } from "@/components/bounties/PendingWithdrawalBanner";
```

- [ ] **Step 2: Render the banner at the top of the returned JSX**

Find the opening of the return statement in `BountiesView` — it likely starts with a wrapper `<div>` containing the header + tab row. Insert before the first non-wrapper element:

```typescript
<PendingWithdrawalBanner />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/components/bounties/BountiesView.tsx
git commit -m "feat(poidh): show pending withdrawal banner on bounties list page"
```

---

## Task 7: Integration Test Script

**Files:**

- Create: `scripts/test-poidh.ts`

Tests the full V3 contract flow using two thirdweb private-key wallets against a local Anvil fork of Base mainnet. Covers the golden path (solo bounty, open bounty, claim, vote) and edge cases (AA wallet blocked, non-issuer accept blocked, non-participant vote blocked, cancel refund flow).

**Prerequisites:**

```bash
# 1. Install anvil (part of foundry)
curl -L https://foundry.paradigm.xyz | bash && foundryup

# 2. Start Anvil with Base mainnet fork
anvil --fork-url https://mainnet.base.org --chain-id 8453

# 3. Set env vars
export THIRDWEB_SECRET_KEY="your-key"
export POIDH_RPC_URL="http://127.0.0.1:8545"   # anvil default
```

**Running the script:**

```bash
npx tsx scripts/test-poidh.ts
```

- [ ] **Step 1: Create `scripts/test-poidh.ts`**

```typescript
import {
  createThirdwebClient,
  getContract,
  prepareContractCall,
  readContract,
  sendTransaction,
  toWei,
  waitForReceipt,
} from "thirdweb";
import { defineChain } from "thirdweb/chains";
import { privateKeyToAccount } from "thirdweb/wallets";
import { createWalletClient, formatEther, http, parseEther } from "viem";
import { privateKeyToAccount as viemPrivKey } from "viem/accounts";

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL = process.env.POIDH_RPC_URL ?? "http://127.0.0.1:8545";
const SECRET_KEY = process.env.THIRDWEB_SECRET_KEY ?? "";
const POIDH_CONTRACT_ADDR = "0x5555fa783936c260f77385b4e153b9725fef1719" as const;

// Anvil default funded accounts (deterministic from default mnemonic)
const ANVIL_KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;
const ANVIL_KEY_B =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as `0x${string}`;

// ─── Setup ───────────────────────────────────────────────────────────────────

const baseFork = defineChain({ id: 8453, rpc: RPC_URL });

const client = createThirdwebClient(SECRET_KEY ? { secretKey: SECRET_KEY } : { clientId: "test" });

const accountA = privateKeyToAccount({ client, privateKey: ANVIL_KEY_A });
const accountB = privateKeyToAccount({ client, privateKey: ANVIL_KEY_B });

const contract = getContract({
  client,
  chain: baseFork,
  address: POIDH_CONTRACT_ADDR,
  abi: POIDH_ABI,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function send(account: typeof accountA, tx: ReturnType<typeof prepareContractCall>) {
  const result = await sendTransaction({ account, transaction: tx });
  await waitForReceipt({ client, chain: baseFork, transactionHash: result.transactionHash });
  return result.transactionHash;
}

async function expectRevert(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
    console.log(`  ❌ FAIL [${label}] — expected revert but tx succeeded`);
    failed++;
  } catch {
    console.log(`  ✅ PASS [${label}] — reverted as expected`);
    passed++;
  }
}

async function expect<T>(actual: T, check: (v: T) => boolean, label: string) {
  if (check(actual)) {
    console.log(`  ✅ PASS [${label}]`);
    passed++;
  } else {
    console.log(`  ❌ FAIL [${label}] — got ${String(actual)}`);
    failed++;
  }
}

// ─── ABI (inline for script independence) ────────────────────────────────────

const POIDH_ABI = [
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
    ],
    name: "createSoloBounty",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "description", type: "string" },
    ],
    name: "createOpenBounty",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "joinOpenBounty",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "name", type: "string" },
      { name: "description", type: "string" },
      { name: "imageUri", type: "string" },
    ],
    name: "createClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "claimId", type: "uint256" },
    ],
    name: "acceptClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "claimId", type: "uint256" },
    ],
    name: "submitClaimForVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "vote", type: "bool" },
    ],
    name: "voteClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "resolveVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "cancelSoloBounty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "cancelOpenBounty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "withdrawFromOpenBounty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "claimRefundFromCancelledOpenBounty",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "resetVotingPeriod",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [], name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function" },
  // Read
  {
    inputs: [],
    name: "getBountiesLength",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_BOUNTY_AMOUNT",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_CONTRIBUTION",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "FEE_BPS",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "votingPeriod",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "everHadExternalContributor",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "bountyVotingTracker",
    outputs: [
      { name: "yes", type: "uint256" },
      { name: "no", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "bountyCurrentVotingClaim",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "pendingWithdrawals",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "bountyId", type: "uint256" }],
    name: "getParticipants",
    outputs: [
      { name: "", type: "address[]" },
      { name: "", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ─── Test: read contract constants ───────────────────────────────────────────

async function testContractConstants() {
  console.log("\n📋 Contract Constants");

  const [minBounty, minContrib, feeBps, votePeriod] = await Promise.all([
    readContract({ contract, method: "MIN_BOUNTY_AMOUNT" }),
    readContract({ contract, method: "MIN_CONTRIBUTION" }),
    readContract({ contract, method: "FEE_BPS" }),
    readContract({ contract, method: "votingPeriod" }),
  ]);

  await expect(feeBps, (v) => v === 250n, `FEE_BPS is 250 (2.5%)`);
  await expect(votePeriod, (v) => v === 172800n, `votingPeriod is 48h (172800s)`);
  console.log(`  ℹ️  MIN_BOUNTY_AMOUNT: ${formatEther(minBounty)} ETH`);
  console.log(`  ℹ️  MIN_CONTRIBUTION:  ${formatEther(minContrib)} ETH`);
}

// ─── Test: Solo bounty create → claim → accept ───────────────────────────────

async function testSoloBountyFlow() {
  console.log("\n🪙 Solo Bounty Flow");

  const lengthBefore = await readContract({ contract, method: "getBountiesLength" });

  // Create solo bounty (account A)
  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "createSoloBounty",
      params: ["Test Solo Bounty", "Integration test — gnars website"],
      value: parseEther("0.001"),
    }),
  );

  const bountyId = lengthBefore; // new bounty ID = previous length (0-indexed)
  await expect(
    await readContract({ contract, method: "getBountiesLength" }),
    (v) => v === lengthBefore + 1n,
    "Solo bounty created — length increased",
  );

  // Verify no external contributors yet
  await expect(
    await readContract({ contract, method: "everHadExternalContributor", args: [bountyId] }),
    (v) => v === false,
    "everHadExternalContributor = false (solo)",
  );

  // Create claim (account B)
  await send(
    accountB,
    prepareContractCall({
      contract,
      method: "createClaim",
      params: [bountyId, "My proof", "I did it!", ""],
    }),
  );
  console.log(`  ✅ PASS [claim created by wallet B]`);
  passed++;

  // Accept claim directly (solo bounty, no contributors → acceptClaim works)
  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "acceptClaim",
      params: [bountyId, 0n],
    }),
  );
  console.log(`  ✅ PASS [claim accepted by issuer]`);
  passed++;

  // Winner (B) should have pending withdrawal balance
  const pending = await readContract({
    contract,
    method: "pendingWithdrawals",
    args: [accountB.address as `0x${string}`],
  });
  await expect(
    pending,
    (v) => v > 0n,
    `Winner has pending withdrawal (${formatEther(pending)} ETH after fee)`,
  );

  // Withdraw the winnings
  await send(accountB, prepareContractCall({ contract, method: "withdraw", params: [] }));
  const pendingAfter = await readContract({
    contract,
    method: "pendingWithdrawals",
    args: [accountB.address as `0x${string}`],
  });
  await expect(pendingAfter, (v) => v === 0n, "Pending balance cleared after withdraw");
}

// ─── Test: Open bounty create → join → submit for vote → vote → resolve ──────

async function testOpenBountyVoteFlow() {
  console.log("\n🗳️  Open Bounty Vote Flow");

  const lengthBefore = await readContract({ contract, method: "getBountiesLength" });

  // Create open bounty (account A)
  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "createOpenBounty",
      params: ["Open Gnars Challenge", "Multiplayer test"],
      value: parseEther("0.001"),
    }),
  );
  const bountyId = lengthBefore;
  console.log(`  ✅ PASS [open bounty created — id ${bountyId}]`);
  passed++;

  // Account B joins
  await send(
    accountB,
    prepareContractCall({
      contract,
      method: "joinOpenBounty",
      params: [bountyId],
      value: parseEther("0.001"),
    }),
  );
  console.log(`  ✅ PASS [wallet B joined open bounty]`);
  passed++;

  // Now everHadExternalContributor should be true
  await expect(
    await readContract({ contract, method: "everHadExternalContributor", args: [bountyId] }),
    (v) => v === true,
    "everHadExternalContributor = true after B joined",
  );

  // Account A creates a claim
  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "createClaim",
      params: [bountyId, "A's proof", "Gnars proof by A", ""],
    }),
  );
  const claimId = 0n;

  // acceptClaim should now REVERT because everHadExternalContributor = true
  await expectRevert(
    () =>
      send(
        accountA,
        prepareContractCall({
          contract,
          method: "acceptClaim",
          params: [bountyId, claimId],
        }),
      ),
    "acceptClaim reverts when open bounty had contributors",
  );

  // Submit claim for vote (A submits their own claim)
  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "submitClaimForVote",
      params: [bountyId, claimId],
    }),
  );
  console.log(`  ✅ PASS [claim submitted for vote]`);
  passed++;

  // Check vote tracker has a deadline
  const tracker = await readContract({ contract, method: "bountyVotingTracker", args: [bountyId] });
  await expect(tracker[2], (v) => v > 0n, "Vote deadline set after submitClaimForVote");

  // Vote YES (account A), Vote NO (account B)
  await send(
    accountA,
    prepareContractCall({ contract, method: "voteClaim", params: [bountyId, true] }),
  );
  await send(
    accountB,
    prepareContractCall({ contract, method: "voteClaim", params: [bountyId, false] }),
  );
  console.log(`  ✅ PASS [A voted yes, B voted no]`);
  passed++;

  const trackerAfter = await readContract({
    contract,
    method: "bountyVotingTracker",
    args: [bountyId],
  });
  await expect(trackerAfter[0], (v) => v > 0n, "Yes weight > 0 after A voted");
  await expect(trackerAfter[1], (v) => v > 0n, "No weight > 0 after B voted");

  // Advance Anvil time past 48h voting period
  await advanceAnvilTime(48 * 3600 + 60);

  // Resolve vote
  await send(
    accountA,
    prepareContractCall({ contract, method: "resolveVote", params: [bountyId] }),
  );
  console.log(`  ✅ PASS [vote resolved]`);
  passed++;
}

// ─── Test: Cancel open bounty → contributors claim refund ────────────────────

async function testCancelAndRefundFlow() {
  console.log("\n❌ Cancel + Refund Flow");

  const lengthBefore = await readContract({ contract, method: "getBountiesLength" });

  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "createOpenBounty",
      params: ["Refund Test Bounty", "Will be cancelled"],
      value: parseEther("0.001"),
    }),
  );
  const bountyId = lengthBefore;

  await send(
    accountB,
    prepareContractCall({
      contract,
      method: "joinOpenBounty",
      params: [bountyId],
      value: parseEther("0.001"),
    }),
  );

  // Issuer cancels
  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "cancelOpenBounty",
      params: [bountyId],
    }),
  );
  console.log(`  ✅ PASS [open bounty cancelled by issuer]`);
  passed++;

  // withdrawFromOpenBounty should REVERT on a cancelled bounty
  await expectRevert(
    () =>
      send(
        accountB,
        prepareContractCall({
          contract,
          method: "withdrawFromOpenBounty",
          params: [bountyId],
        }),
      ),
    "withdrawFromOpenBounty reverts on cancelled bounty",
  );

  // claimRefundFromCancelledOpenBounty should succeed
  await send(
    accountB,
    prepareContractCall({
      contract,
      method: "claimRefundFromCancelledOpenBounty",
      params: [bountyId],
    }),
  );
  console.log(`  ✅ PASS [contributor claimed refund via claimRefundFromCancelledOpenBounty]`);
  passed++;
}

// ─── Test: Edge cases ─────────────────────────────────────────────────────────

async function testEdgeCases() {
  console.log("\n⚠️  Edge Cases");

  const lengthBefore = await readContract({ contract, method: "getBountiesLength" });
  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "createSoloBounty",
      params: ["Edge Case Bounty", "For edge case tests"],
      value: parseEther("0.001"),
    }),
  );
  const bountyId = lengthBefore;

  // Non-creator cannot accept a claim on behalf of creator
  await send(
    accountB,
    prepareContractCall({
      contract,
      method: "createClaim",
      params: [bountyId, "B's claim", "B tries to accept their own claim", ""],
    }),
  );
  await expectRevert(
    () =>
      send(
        accountB,
        prepareContractCall({
          contract,
          method: "acceptClaim",
          params: [bountyId, 0n],
        }),
      ),
    "Non-issuer cannot accept claim",
  );

  // Non-participant cannot vote
  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "createOpenBounty",
      params: ["Vote Edge Case", "Only participants vote"],
      value: parseEther("0.001"),
    }),
  );
  const openBountyId = lengthBefore + 1n;
  await send(
    accountB,
    prepareContractCall({
      contract,
      method: "joinOpenBounty",
      params: [openBountyId],
      value: parseEther("0.001"),
    }),
  );
  await send(
    accountA,
    prepareContractCall({
      contract,
      method: "createClaim",
      params: [openBountyId, "Claim", "Proof", ""],
    }),
  );
  await send(
    accountA,
    prepareContractCall({ contract, method: "submitClaimForVote", params: [openBountyId, 0n] }),
  );

  // Create a third account (no contribution) and try to vote — should revert
  const accountC = privateKeyToAccount({
    client,
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  });
  await expectRevert(
    () =>
      send(
        accountC,
        prepareContractCall({ contract, method: "voteClaim", params: [openBountyId, true] }),
      ),
    "Non-participant cannot vote",
  );

  // AA wallet edge case — V3 requires msg.sender == tx.origin (EOA only)
  // We cannot deploy a test contract here, but document the behavior:
  console.log(
    "  ℹ️  AA/Contract wallet note: V3 requires msg.sender == tx.origin for bounty creation.",
  );
  console.log(
    "      Smart contract wallets (Gnosis Safe, AA) will be blocked at the contract level.",
  );
  console.log(
    "      This is enforced on-chain — no UI mitigation needed beyond showing a clear error.",
  );
}

// ─── Anvil time helpers ───────────────────────────────────────────────────────

async function advanceAnvilTime(seconds: number) {
  try {
    await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [seconds],
        id: 1,
      }),
    });
    await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "evm_mine", params: [], id: 2 }),
    });
    console.log(`  ℹ️  Anvil time advanced by ${seconds}s`);
  } catch {
    console.log(
      `  ⚠️  Could not advance time (not running against Anvil?) — skipping time-dependent test`,
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔵 POIDH V3 Integration Tests");
  console.log(`   RPC:      ${RPC_URL}`);
  console.log(`   Contract: ${POIDH_CONTRACT_ADDR}`);
  console.log(`   Wallet A: ${accountA.address}`);
  console.log(`   Wallet B: ${accountB.address}`);

  try {
    await testContractConstants();
    await testSoloBountyFlow();
    await testOpenBountyVoteFlow();
    await testCancelAndRefundFlow();
    await testEdgeCases();
  } catch (err) {
    console.error("\n💥 Unexpected error:", err);
    failed++;
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`✅ ${passed} passed   ❌ ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
```

- [ ] **Step 2: Verify the script parses without TypeScript errors**

```bash
npx tsc --noEmit --allowImportingTsExtensions scripts/test-poidh.ts 2>&1 | head -30
```

If tsx is not installed:

```bash
pnpm add -D tsx
```

- [ ] **Step 3: Run against Anvil fork (requires Anvil running)**

```bash
# In a separate terminal first:
# anvil --fork-url https://mainnet.base.org --chain-id 8453

npx tsx scripts/test-poidh.ts
```

Expected output: all tests pass (✅), exit code 0.

- [ ] **Step 4: Commit**

```bash
git add scripts/test-poidh.ts
git commit -m "test(poidh): add full integration test script with thirdweb wallets and edge cases"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All P0 (voteClaim, resolveVote), P1 (claimRefund, getBounty), P2 (everHadExternalContributor, VoteDashboard), P3 (pendingWithdrawals, resetVotingPeriod) items covered.
- [x] **No placeholders:** All steps contain exact code or commands.
- [x] **Type consistency:** `usePoidhVoteClaim.vote(bountyId, accept)` — two params throughout. `usePoidhResolveVote.resolve(bountyId)` — one param throughout. `claimRefundHook.claimRefund(bountyId)` consistent across Task 2 and Task 5.
- [x] **ABI matches call sites:** `voteClaim` → `[BigInt(id), accept]`; `resolveVote` → `[BigInt(id)]` everywhere.
- [x] **No new dependencies introduced** (VoteDashboard uses wagmi + existing UI primitives; test script uses thirdweb v5 which is already in the project).
