---
name: feedback_code_review_findings
description: Web3 efficiency issues found in deep review on 2026-03-16, ranked by impact
type: feedback
---

Issues found during deep Web3 review. Use this when suggesting improvements or opening new work items.

**Why:** Deep audit revealed concrete RPC inefficiencies, dead code, and anti-patterns that affect
UX (extra RPC round-trips, stale UI after transactions) and maintainability.

**How to apply:** Before touching any of these files, check this list. Prioritize HIGH items first.

## HIGH Impact

### 1. `useProposalEligibility` — 3 separate RPC calls instead of 1 multicall
File: `src/hooks/useProposalEligibility.ts` lines 67–91
Three `useReadContract` calls (proposalThreshold, getVotes, delegates) fire independently.
They should be combined into one `useReadContracts` call, same as `useVotes` already does.
This fires 3 eth_call requests where 1 batched call would suffice.

### 2. `AuctionSpotlight` — page reload after bid/settle
File: `src/components/hero/AuctionSpotlight.tsx` lines 174, 238
Uses `setTimeout(() => window.location.reload(), ...)` to refresh state after a bid or settlement.
This is a hard page reload — loses all React state, triggers full SSR, bad UX.
Fix: invalidate the relevant React Query keys or call `useDaoAuction`'s refetch instead.

### 3. `useCastVote` — simulation always uses FOR support
File: `src/hooks/useCastVote.ts` line 38
`useSimulateContract` always simulates with `supportMap.FOR`. The actual `castVote` call uses
the user's chosen support. The simulation result is never used (no `simulateVote.data` passed to
writeContractAsync). The simulation is wasted RPC overhead. Either remove it or make it reactive
to the user's actual choice.

### 4. `useENSBatch` — defined but never used
File: `src/hooks/use-ens.ts` line 64
`useENSBatch` is exported but no component imports it. Address lists (vote cards, member pages)
each call `useENSOptimistic` individually, spawning N serial ENS requests.
If there are lists of addresses (proposals, voters, supporters), batch resolve them.

## MEDIUM Impact

### 5. Dead ABI files
Files: `src/utils/abis/gnarsLootboxV2Abi.ts`, `src/utils/abis/gnarsLootboxV3Abi.ts`
Not imported anywhere. Should be deleted to reduce confusion and bundle size.

### 6. `use-lootbox-contract.ts` — `flexNftsLength` fetched twice
File: `src/hooks/use-lootbox-contract.ts` lines 98, 174
`flexNftsLength` is already in the 19-call `useReadContracts` batch (index 18), but then fetched
again separately via another `useReadContract` call (line 174). The second call is redundant.
Use `data?.[18]?.result` directly.

### 7. `use-lootbox-contract.ts` — `setTimeout` for post-tx refetch
File: `src/hooks/use-lootbox-contract.ts` line 131
`setTimeout(() => refetch(), 2000)` after a confirmed transaction. This is a race condition;
the 2s delay is arbitrary. Use `queryClient.invalidateQueries` or wagmi's built-in invalidation
after `isConfirmed` becomes true without a timer.

### 8. `handleWithdrawToken` passes raw string to contract without `isAddress` check
File: `src/hooks/use-lootbox-actions.ts` line 815
`tokenAddress as Address` cast with no viem `isAddress()` validation before the write call.
Other handlers in the same file do validate (`normalizeAddress`). Inconsistent pattern.

### 9. `handleSetTreasury` passes raw string without `isAddress` check
File: `src/hooks/use-lootbox-actions.ts` line 362
`treasuryInput as Address` — same issue as #8. No validation before passing to contract.

## LOW Impact

### 10. Wagmi `rank: false` in fallback transport
File: `src/lib/wagmi.ts` line 47
`rank: false` disables wagmi's adaptive RPC ranking. Means a slow/failing RPC is retried equally
with healthy ones. Consider `rank: true` for production to auto-deprioritize bad endpoints.

### 11. `QueryClient` module-level singleton may cause SSR staleness
File: `src/components/layout/Providers.tsx` lines 10–32
Module-level singleton works for SPA but in Next.js SSR each request should get a fresh
QueryClient instance. The current pattern is safe only because all contract reads are client-side
(wagmi hooks), but if any server-rendered component ever calls into react-query it could serve
stale cached data across requests. The recommended pattern is to use `useState` or `useRef` inside
the component for the QueryClient instance when SSR queries are present.

### 12. Missing `chainId` on some `useReadContract` calls
File: `src/hooks/use-lootbox-contract.ts` lines 150–171
`contractGnarsBalance`, `walletGnarsBalance`, `gnarsAllowance` calls omit `chainId`. Wagmi uses
the connected wallet's chain as default. If the wallet is on the wrong chain, these silently
return data from the wrong network. Add `chainId: base.id` for safety.
