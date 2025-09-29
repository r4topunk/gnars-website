# Plan — proposal-voting-integration

## Approach Summary
- Reuse the global wagmi setup to enable onchain voting via the Governor contract.
- Update proposal detail UI to surface voting controls when the viewer is eligible (connected wallet, active proposal, not yet voted).
- Implement a dedicated hook/component logic that uses wagmi `useSimulateContract` and `useWriteContract` with the Governor ABI, following patterns from proposal submission and auction bidding.
- Ensure vote submission updates UI state and refetches proposal data to reflect the new vote tally.

## Steps
- [x] Expose a shared Governor ABI (reuse from references; locate best source).
- [ ] Build a voting hook that wires up wagmi (`useAccount`, `useSimulateContract`, `useWriteContract`) for `castVote`/`castVoteWithReason`.
- [ ] Update `VotingControls` to use the hook: handle eligibility, pending states, toasts, and disable logic; remove mock delay.
- [ ] Un-hide voting card in `ProposalDetail` and wire it with real data (active state, existing votes, refetch callback).
- [ ] Trigger proposal data refresh post-vote (client refetch or optimistic update) to sync vote tallies.
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

