# Plan — proposal-voting-integration

## Approach Summary
- Reuse the global wagmi setup to enable onchain voting via the Governor contract, including optional vote comments that call `castVoteWithReason`.
- Update proposal detail UI to surface voting controls only when the viewer is eligible (connected wallet, >=1 GNAR voting power, active proposal, not yet voted).
- Implement a dedicated hook/component logic that uses wagmi `useSimulateContract` and `useWriteContract` with the Governor ABI, following patterns from proposal submission and auction bidding.
- Ensure vote submission updates UI state and refetches proposal data to reflect the new vote tally and captured comment.

## Steps
- [x] Expose a shared Governor ABI (reuse from references; locate best source).
- [ ] Extend the voting hook to support optional reasons (`castVoteWithReason`) and surface eligibility helpers (>=1 GNAR delegated).
- [ ] Update `VotingControls` UI: add comment textarea, display eligibility messaging, and gate entire block when viewer cannot vote.
- [ ] Adjust `ProposalDetail` to respect gating (hide vote card for ineligible users) and wire success handling/refetch.
- [ ] Trigger proposal data refresh post-vote (client refetch or optimistic update) to sync vote tallies and comment state.
- [ ] Validate with linting and manual flow instructions.

## File/Module Touchpoints
- `src/utils/abis/` (add `governorAbi` export or reuse existing).
- `src/hooks/` (new `use-cast-vote` or similar).
- `src/components/common/VotingControls.tsx` (real voting logic + UI updates).
- `src/components/proposals/detail/ProposalDetail.tsx` (show voting card, integrate hook).
- Potentially `src/services/proposals.ts` or detail page to support refetch.

## Data / API Changes
- None server-side; client-side wagmi interactions with existing Governor contract.
- Might add client refetch call to `getProposalByIdOrNumber` via action or fetcher.

## Testing Strategy
- Manual dev testing: connect wallet (with Base network) and attempt vote (simulate via test wallet or ensure safe guard). For now, ensure UI states handle disabled/ineligible cases gracefully.
- Unit/E2E tests not planned due to onchain dependency; rely on hooking to real contract logic.
- Run `pnpm lint` to ensure code quality.

## Acceptance Criteria
- Voting buttons visible for active proposals when user has voting power and hasn’t voted.
- Clicking a vote triggers wagmi transaction flow and toasts on success/failure.
- After voting, UI disables buttons, highlights selection, and vote totals reflect the change (via refetch or state update).

