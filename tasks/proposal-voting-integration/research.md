# Research — proposal-voting-integration

## Goal

- Understand current wagmi configuration/utilization in the Gnars website.
- Identify existing proposal voting UI/data flow and gaps preventing onchain voting.
- Surface references (repo README, Builder docs) to guide implementing real proposal voting with wagmi.

## Existing Patterns / References
- `src/lib/wagmi.ts`: shared wagmi config (Base chain, connectors, cookie storage, SSR enabled).
- `src/components/layout/Providers.tsx`: wraps app with `WagmiProvider` + React Query.
- `src/components/ui/ConnectButton.tsx`: wallet connect UX using wagmi hooks.
- `src/hooks/useVotes.ts`: reads voting power/threshold via `useReadContracts` (token + governor ABIs inline).
- `src/components/proposals/detail/ProposalDetail.tsx`: renders proposal details; voting card currently hidden and stubbed (`VotingControls`).
- `src/components/common/VotingControls.tsx`: mock voting UX (setTimeout, no contract interaction) and hidden by parent.
- `src/components/proposals/ProposalPreview.tsx`: uses wagmi `useWriteContract` + inline governor ABI to submit proposals—pattern for contract writes.
- `src/services/proposals.ts`: fetches proposals from `@buildeross/sdk`, includes vote list data.
- Repository `README.md`: emphasizes wagmi v2 + viem; Base chain addresses in `src/lib/config.ts` (governor, token, etc.).
- References under `references/nouns-builder/` and `references/gnars-terminal/` contain full governor ABIs and vote components (cast vote flows).

## Findings
- Wagmi is configured globally with Base RPC and connectors; SSR safe config already exported.
- Voting UI (`VotingControls`) is decoupled but currently mocked; actual contract write + state updates missing.
- `ProposalDetail` hides the voting card via `className="hidden"`; enabling requires gating conditions (wallet connection, active state, voting power, duplicate vote prevention).
- No direct hook exists for casting votes; need governor ABI (likely reuse from references) and wagmi `useSimulateContract`/`useWriteContract` for `castVote`/`castVoteWithReason`.
- Proposal votes list originates from subgraph via `services/proposals.ts`; after voting, we need a refetch/optimistic update strategy.
- Connect wallet flow already works; voting should piggyback on `useAccount` and `useVotes` (voting power) for eligibility messaging.

## Risks / Constraints
- Must ensure correct governor address (`GNARS_ADDRESSES.governor`) and support for all vote types (For/Against/Abstain => support uint8 1/0/2 per GovernorBravo).
- Need to handle wagmi/viem BigInt conversions, error surfaces, pending state (modals/toasts) per existing UX.
- Avoid duplicate ABIs scatter—should centralize (maybe in `src/utils/abis`?) without bloating bundle.
- Voting requires connected wallet with delegations; confirm `useVotes` returns accurate `isOwner`, `hasThreshold`, etc. Possibly need to check whether user already voted (subgraph data) vs on-chain `hasVoted`.
- SSR vs CSR: contract interactions only allowed client-side; ensure components marked `"use client"`.
- Toast + UI states must align with design guidelines (Shadcn, follow conventions).

## Open Questions
- Do we prefer `castVote` or `castVoteWithReason` (needs reason string)? Assume simple `castVote` unless spec requires reason.
- Should vote submission trigger a refetch of proposal detail from server or mutate client state? Likely need to refetch via action or client fetch.
- Need confirmation whether to surface eligibility messaging from `useVotes` or new hook.

