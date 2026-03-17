---
name: project_web3_patterns
description: Key Web3 integration patterns, gotchas, and architecture decisions in gnars-website
type: project
---

## Provider Setup
- WagmiProvider + QueryClientProvider in `src/components/layout/Providers.tsx`
- Singleton pattern (module-level variables) prevents duplicate instances on HMR
- QueryClient default staleTime: 5 min, refetchOnWindowFocus: false
- wagmi config: SSR-safe via cookieStorage, 7-RPC fallback chain for Base

## Contract Addresses
All centralized in `src/lib/config.ts` under `GNARS_ADDRESSES`. Never hardcoded elsewhere.

## ABI Strategy
- Full ABIs used for main contracts (gnarsGovernorAbi, gnarsLootboxV4Abi, auctionAbi)
- Inline minimal ABIs in hooks that only need 1-3 functions (useVotes, useDelegate, useProposalEligibility)
- gnarsLootboxV2Abi and gnarsLootboxV3Abi exist as files but are UNUSED — dead code

## Multicall Usage
- `useReadContracts` (wagmi multicall wrapper) used in: useVotes, useLootboxContract, useDaoSettings, DelegationModal
- `useProposalEligibility` uses 3 separate `useReadContract` calls — NOT batched (known inefficiency)

## Subgraph vs RPC Split
- Auction history, proposals, vote history: subgraph via `/api/*` routes or `@buildeross/hooks`
- Live auction state: `useDaoAuction` from `@buildeross/hooks` (Builder SDK)
- ETH price: internal API route `/api/eth-price` (wraps Alchemy)
- ENS resolution: internal `resolveENS` / `resolveENSBatch` (not wagmi useEnsName)

## ERC-6372 Timestamp Clock
Gnars token and governor use timestamp-based clock (not block-based). `proposalSnapshot()` returns
a Unix timestamp, NOT a block number. The subgraph's `snapshotBlockNumber` field is WRONG to use
with `getPastVotes`. Always fetch `proposalSnapshot()` from the contract.

## Transaction Pattern
All write hooks follow: chain check → switchChainAsync → writeContractAsync → toast feedback
Error handling covers: user rejection, timeout, revert (with specific messaging per case)

## Lootbox V4
- `src/hooks/use-lootbox-contract.ts`: 19-call multicall batch for contract state
- `src/hooks/use-lootbox-actions.ts`: all write operations, uses publicClient.waitForTransactionReceipt for 2-step flows (approve + deposit)
- `useWatchContractEvent` for FlexOpened — deduped via `seenFlexEvents` ref
- gnarsLootboxV2Abi and gnarsLootboxV3Abi are dead files (not imported anywhere)

## Known Issues (from 2026-03-16 review)
See feedback_code_review_findings.md for ranked list.
