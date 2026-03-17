---
name: agent_team_candidates
description: Top multi-agent task candidates identified from codebase audit (March 2026). Includes file lists, agent splits, and risks for 4 prioritized tasks.
type: project
---

Four agent-team tasks identified and documented in `docs/research/agent-team-candidates.md`.

**Why:** Codebase audit looking for parallelizable medium-sized improvements.

**How to apply:** Reference this when planning implementation sprints. The send-tokens decimals fix (Candidate 2) is highest priority due to correctness risk.

## Quick Reference

**Candidate 1 — SEO metadata + OG images (7 pages)**
- Missing metadata: treasury, members, feed, lootbox, tv (root), mural, propose
- Missing OG images: members, feed, lootbox, mural, propose
- Pure parallelism, zero risk

**Candidate 2 — send-tokens decimals fix (CORRECTNESS BUG)**
- TODO at `src/lib/proposal-utils.ts:42` — hardcoded 18 decimals for generic ERC-20
- Wrong calldata if sending 6-decimal token (USDC etc.)
- Files: send-tokens-form.tsx, proposal-utils.ts, schema.ts, ActionForms.tsx
- Risk: need debounce on RPC call + fallback if token lacks decimals()

**Candidate 3 — NftHoldings SC migration**
- `src/components/treasury/NftHoldings.tsx` is "use client" doing subgraph fetch in useEffect
- Pattern: should follow TokenHoldings.tsx (SC wrapper + client display)
- Improves treasury page TTI

**Candidate 4 — Members search + metadata**
- `src/app/members/page.tsx` passes `showSearch={false}` — search is hidden/disabled
- Client-side filter already implemented in MembersList.tsx
- Missing metadata on members page
