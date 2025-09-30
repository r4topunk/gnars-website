# Plan — vote-ui-enhancement

## Approach Summary
- Add `reason?: string | null` to `proposalVoteSchema` and propagate in `mapSdkProposalToProposal` from SDK data.
- Replace `ProposalVotesTable` with a new `ProposalVotesList` card-based layout inspired by the terminal reference.
- Use `AddressDisplay` (compact with avatar) for voter identity, a color-coded badge for choice, formatted weight, and an optional markdown-rendered comment box.
- Wire the new component in `ProposalDetail` under the Votes tab.

## Steps
- [ ] Extend schema and types to include `reason` on `ProposalVote`.
- [ ] Update `src/services/proposals.ts` to map `v.reason`.
- [ ] Implement `src/components/proposals/detail/ProposalVotesList.tsx`.
- [ ] Replace usage in `ProposalDetail` to pass through `reason` and use new list component.
- [ ] Lint and adjust styles for consistency with shadcn.

## File/Module Touchpoints
- `src/lib/schemas/proposals.ts`
- `src/services/proposals.ts`
- `src/components/proposals/detail/ProposalVotesList.tsx` (new)
- `src/components/proposals/detail/ProposalDetail.tsx`

## Data / API Changes
- Type-only addition of optional `reason` in `Proposal.votes[]`.

## Testing Strategy
- Open a proposal with votes and comments to verify:
  - Address + avatar renders and links to member page.
  - Choice badge color reflects FOR/AGAINST/ABSTAIN.
  - Weight formatted with locale separators.
  - Reason renders as markdown inside a muted container.
  - Empty state preserved.

## Acceptance Criteria
- Votes tab shows card list with avatar, address, choice, weight, and optional comment.
- No TypeScript or lint errors.
