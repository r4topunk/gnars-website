# Research — vote-ui-enhancement

## Goal

Enhance proposal votes UI to show address + avatar, vote choice and weight, and optional comment/reason. Mirror layout from `references/gnars-terminal` without the yellow name badge.

## Existing Patterns / References
- `src/components/proposals/detail/ProposalVotesTable.tsx` shows a simple table with voter, choice, and votes.
- `src/components/ui/address-display.tsx` provides ENS-aware address with avatar.
- `src/components/common/Markdown.tsx` for rendering comment text when present.
- Data source: `mapSdkProposalToProposal` in `src/services/proposals.ts` builds `Proposal.votes` but currently omits `reason`.
- Reference UI: `references/gnars-terminal/src/components/proposal/ProposalVotesContent.tsx` renders a card per vote with avatar, address, choice badge, weight, and optional comment block.

## Findings
- Our `proposalVoteSchema` lacks a `reason` field; add `reason?: string | null`.
- Mapping in `services/proposals.ts` can read `v.reason` from SDK and include it.
- Replace table with a list of cards using `AddressDisplay` (variant "compact" with avatar) and a muted box for reason rendered via `Markdown`.

## Risks / Constraints
- Changing schema is a typed change; ensure all sites that build `ProposalVote` are updated.
- Some proposals may not have `votes`; handle empty state.
- `votes` weight is a string; retain formatting with `toLocaleString`.

## Open Questions
- None identified; simple presentational change.
