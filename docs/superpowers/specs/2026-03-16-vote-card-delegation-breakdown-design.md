# Vote Card Delegation Breakdown

**Date:** 2026-03-16
**Status:** Approved
**Component:** `ProposalVotesList`

## Summary

Add visual differentiation between a voter's own tokens and votes delegated to them in the Individual Votes cards on the proposal page. Only shown when delegation is present. Uses a lazy fetch + tooltip pattern — no upfront cost, no changes to existing data layer.

## Scope

Single component change: `src/components/proposals/detail/ProposalVotesList.tsx`.

No changes to:
- `ProposalVoteItem` type
- Subgraph queries
- Parent components (`ProposalDetail`, `ProposalVotesList` props API)

## Behavior

### Tags

Rendered inline after "with X votes" in each vote card header:

```
r4topunk.eth  voted  FOR  with 41 votes  [20 own]  [21 delegated ↓]  · 2h ago
```

- **"own" tag**: low-emphasis label. `bg-muted text-muted-foreground`
- **"delegated" tag**: same + `border border-border` for hover/click affordance
- **Visibility rule**: tags only appear when `delegators.length > 0` after fetch. Cards with no delegation look unchanged.

### Tooltip

Triggered by hover (desktop) or touch (mobile) on the "delegated" tag. Uses shadcn `<Tooltip>` — inherits light/dark mode automatically via `bg-popover border shadow`.

Content:
```
DELEGATED FROM
gnarly.eth        12
0x4f2a…c3d1        6
skater.eth         3
```

- Fetched lazily on first `open` event per voter
- Cached in a shared `useRef` map in `ProposalVotesList` — repeated hovers are instant
- Shows spinner while loading
- Shows short error message on fetch failure ("Could not load")

## Component Structure

New component: `DelegationTooltip`

```
ProposalVotesList
└── per vote card
    └── DelegationTooltip
        ├── Tooltip (shadcn) — wraps "delegated" tag trigger
        │   └── TooltipContent — delegator list or spinner or error
        └── "own" tag — plain span, no interactivity
```

### `DelegationTooltip` props

```ts
interface DelegationTooltipProps {
  voterAddress: string;
  totalVotes: number;
  cache: React.MutableRefObject<Map<string, DelegatorWithCount[]>>;
}
```

### Own votes derivation

```ts
ownVotes = totalVotes - sum(delegators.map(d => d.tokenCount))
```

Self-delegation artifacts filtered out: `delegators.filter(d => d.owner !== voterAddress)`

Note: `ProposalVoteItem.votes` is typed as `string` — cast at call site: `Number(vote.votes)`

## Data Transport

`fetchDelegatorsWithCounts` is a server-side function — it cannot be called directly from a `"use client"` component. Wrap it in a thin API route:

```
GET /api/delegators/[address]
→ returns DelegatorWithCount[]
```

`DelegationTooltip` fetches via `fetch('/api/delegators/${voterAddress}')` on tooltip open. This follows the existing pattern in `/api/members/active/route.ts`.

## Data Flow

1. `ProposalVotesList` mounts — no extra fetches
2. User hovers "delegated" tag → `open=true`
3. **Cache miss**: `DelegationTooltip` calls `/api/delegators/[address]` → spinner shown
4. Response arrives: writes to cache, derives `ownVotes`, renders list
5. **Cache hit**: renders immediately

## Edge Cases

| Case | Behavior |
|------|----------|
| No delegators returned | Tags not rendered — card unchanged |
| Voter delegated away | `fetchDelegatorsWithCounts` returns empty → no tags |
| Self-delegation in delegators list | Filter `owner === voterAddress` before sum |
| Delegation changed since snapshot | Shows current state (not snapshot). Acceptable — noted in code comment |
| Fetch error | Tooltip shows "Could not load" — no crash |
| Mobile (touch) | shadcn `<Tooltip>` does not open on tap by default. Acceptable to support desktop hover only in v1 — mobile users see the total vote count without breakdown. |

## Styling Reference

```
"own" tag:       bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded
"delegated" tag: bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded border border-border cursor-pointer
tooltip:         shadcn <Tooltip> + <TooltipContent> — no custom colors needed
```
