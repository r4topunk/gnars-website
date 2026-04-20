# AGENTS.md

Subagent routing guide. For documentation rules, tech stack, and PR protocol see `CLAUDE.md`.

## Agent Team — Subagent Routing

Use this table to decide which subagent to dispatch for a given task:

| Signal | Subagent | When |
|--------|----------|------|
| Need to understand existing code/patterns | **research-analyst** | Before any implementation, exploring unfamiliar areas |
| Build component logic, hooks, pages | **frontend-engineer** | React state, data fetching hooks, page structure |
| Styling, layout, responsive, accessibility | **ui-designer** | Tailwind classes, animations, design polish |
| API routes, services, caching, subgraph | **api-architect** | Data layer, server-side fetching, performance |
| Contract calls, wallet, transactions | **web3-specialist** | wagmi/viem, ABIs, onchain data, Web3 flows |
| Write or update documentation | **docs-writer** | Docs in `docs/`, code comments, ADRs |

### Parallel Dispatch Rules

- **Independent tasks** → dispatch multiple subagents in parallel
- **Research then implement** → research-analyst first, then implementation agent
- **Frontend + styling** → frontend-engineer for logic, ui-designer for visual (can run in parallel on different files)
- **Avoid file conflicts** → never dispatch two agents that edit the same file

### Spawning as Agent Team (Experimental)

When the task benefits from inter-agent communication (not just parallel work), use agent teams instead of subagents. Example spawn prompts:

```
Create an agent team with:
- A research-analyst to investigate the current auction implementation
- A frontend-engineer to build the new auction countdown component
- A web3-specialist to implement the bidding transaction flow
Have the researcher share findings with the other two before they start implementing.
```

```
Create an agent team with 3 teammates:
- frontend-engineer: implement the proposal detail page layout and state
- ui-designer: style the proposal cards and voting interface
- api-architect: create the proposal data service and caching layer
Each teammate owns different files. Coordinate through the shared task list.
```

Use subagents (not teams) when:
- Tasks are independent and don't need to share findings
- Only one agent is needed
- The task is quick/focused (research, single component, docs update)
