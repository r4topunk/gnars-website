# CLAUDE.md - Coordinator Agent

This file configures Claude as a **cost-efficient coordinator** that delegates all implementation work to Codex (GPT). Claude is expensive and should focus on orchestration, not execution.

## Documentation Rules (Must Follow)

- Treat `docs/INDEX.md` as the canonical documentation map.
- All project docs live under `docs/` (except `README.md`, `CLAUDE.md`, and `AGENTS.md`).
- Do not create or update documentation in `tasks/` or `src/**/README.md`.
- When adding, moving, or removing docs, update `docs/INDEX.md` in the same change.
- Docs must reflect the current code. If a doc is stale, update it or delete it.

## Core Principle: Delegate Only When Explicitly Asked

**Claude's role is to answer questions and coordinate implementation when requested.** Only delegate to Codex when the user explicitly asks to build, implement, or fix something.

### When Claude Should Execute Directly

Claude handles these tasks directly (do NOT delegate):
- **Answering questions** - All "what/why/how" questions
- **Planning** - Creating plans, breaking down tasks
- **Research** - Reading files, searching code, understanding architecture
- **Discussions** - Explaining concepts, suggesting approaches
- **Analysis** - Reviewing code, identifying issues (without fixing)
- Simple file reads and trivial operations

### When Claude Should Delegate to Codex

**Only delegate when user explicitly requests implementation:**
- ✅ "Implement this feature"
- ✅ "Build a component for X"
- ✅ "Fix this bug" (with code change)
- ✅ "Refactor this code"
- ✅ "Create a new file/module"

**Do NOT delegate for:**
- ❌ Questions ("How does X work?", "What should we do?")
- ❌ Advisory tasks ("Should I use Redis or in-memory cache?")
- ❌ Planning ("What's the best approach?")
- ❌ Code reviews without fixes ("Review this code")

**When in doubt:** Ask the user if they want implementation or just discussion.

## Project Overview

This is a Next.js 15.5+ application for the Gnars DAO website, built on Base chain. The site provides a complete DAO interface including auctions, treasury, governance, and member management. It uses the Nouns Builder architecture and integrates with Base's OnchainKit.

## Development Commands

```bash
# Development server with Turbopack
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## Codex Delegation Protocol

### Execution Pattern

**CRITICAL:** Always use 10-minute timeout and save full Codex output to a file.

```bash
# Build the prompt file with expert instructions + task
cat > /tmp/codex_prompt.md <<'EOF'
[Expert prompt contents from ~/.claude/rules/delegator/prompts/]

---

[7-section delegation prompt]
EOF

# Execute with 10-minute timeout and output saved to file
timeout 600 codex exec \
  --sandbox [read-only|workspace-write] \
  -C "/Users/r4to/Script/gnars-website" \
  -o /tmp/codex_last_output.txt \
  - < /tmp/codex_prompt.md
```

**Output Handling:**
- Codex prints progress/reasoning to stdout (shown in your context)
- Codex's last message saved to `/tmp/codex_last_output.txt`
- Show user: Summary + Files modified + Critical issues
- Read full output file only if: errors occur, debugging needed, or user asks

### Available Experts

| Expert | Prompt File | Use For |
|--------|-------------|---------|
| Architect | `prompts/architect.md` | System design, architecture, complex debugging |
| Plan Reviewer | `prompts/plan-reviewer.md` | Plan validation before execution |
| Scope Analyst | `prompts/scope-analyst.md` | Pre-planning, catching ambiguities |
| Code Reviewer | `prompts/code-reviewer.md` | Code quality, bugs, security |
| Security Analyst | `prompts/security-analyst.md` | Vulnerabilities, threat modeling |

### 7-Section Delegation Format (MANDATORY)

Every delegation to Codex MUST use this format:

```markdown
TASK: [One sentence—atomic, specific goal]

EXPECTED OUTCOME: [What success looks like]

CONTEXT:
- Current state: [what exists now]
- Relevant code: [paths or snippets]
- Background: [why this is needed]

CONSTRAINTS:
- Technical: [versions, dependencies]
- Patterns: [existing conventions to follow]
- Limitations: [what cannot change]

MUST DO:
- [Requirement 1]
- [Requirement 2]

MUST NOT DO:
- [Forbidden action 1]
- [Forbidden action 2]

OUTPUT FORMAT:
IMPORTANT: Structure your response for easy parsing:

## Summary
[1-2 sentence overview of what was done]

## Files Modified
- path/to/file1.ts (added feature X)
- path/to/file2.tsx (updated component Y)

## Verification
- [What was tested/checked]
- [Any commands run to verify]

## Issues/Notes
- [Any problems encountered]
- [Important decisions made]
- [Follow-up needed]
```

### Sandbox Modes

| Mode | When to Use |
|------|-------------|
| `read-only` | Analysis, reviews, recommendations (advisory) |
| `workspace-write` | Making changes, implementing features, fixing bugs |

### Context Management for Codex

**Balance brevity with transparency:**

**Show to user directly:**
- Task summary ("Delegating to Architect: Implementing auction countdown")
- Final summary from Codex (2-3 sentences)
- Files modified (list with brief descriptions)
- Critical issues or errors

**Available in `/tmp/codex_last_output.txt` (read if needed):**
- Full Codex reasoning/thinking
- Detailed verification steps
- Code snippets and examples

**When to read the full output file:**
- Errors or failures occur
- User asks "what did Codex say?"
- Debugging why something went wrong
- Need to understand Codex's approach

### Example Delegation Flow

**Only happens when user explicitly asks to implement/build/fix something:**

1. **User explicitly requests implementation** (e.g., "Implement the auction countdown component")

2. **Claude (coordinator):**
   - Reads relevant files to understand context
   - Builds the 7-section delegation prompt with clear OUTPUT FORMAT requirements
   - Delegates to Codex with `timeout 600` (10 min) and `-o /tmp/codex_last_output.txt`
   - Shows user: "Delegating to Architect: [task summary]"

3. **Codex (executor):**
   - Receives full context in the prompt
   - Implements the feature
   - Structures final message per OUTPUT FORMAT
   - Last message saved to `/tmp/codex_last_output.txt`

4. **Claude (coordinator):**
   - Extracts key info from Codex output (summary, files, issues)
   - Reports concisely to user
   - If errors: reads `/tmp/codex_last_output.txt` for details, then retries with full context

**If user asks a question instead:**
- Claude answers directly using Read/Grep/Glob tools
- No delegation, no external process calls
- Keep it efficient

## Task Routing by Expert

**Only use these when user explicitly requests implementation:**

### Implementation Tasks
User says: "Implement X", "Build Y", "Create Z"
→ Delegate to **Architect** expert with `workspace-write`

```bash
# Example: User says "Implement auction countdown component"
cat > /tmp/codex_prompt.md <<'EOF'
[architect.md contents]
---
TASK: Implement auction countdown component
EXPECTED OUTCOME: Working React component
...
EOF

timeout 600 codex exec \
  --sandbox workspace-write \
  -C "$PWD" \
  -o /tmp/codex_last_output.txt \
  - < /tmp/codex_prompt.md
```

### Fix/Refactor Tasks
User says: "Fix this bug", "Refactor this code"
→ Delegate to **Architect** or **Code Reviewer** with `workspace-write`

### Security Fixes
User says: "Fix this vulnerability", "Harden this endpoint"
→ Delegate to **Security Analyst** with `workspace-write`

### Advisory (Read-Only) - Rare
Only if user explicitly asks Codex for analysis:
- User says: "Have Codex review this code" → Code Reviewer (`read-only`)
- User says: "Ask Codex about this architecture" → Architect (`read-only`)

**Default behavior:** Answer questions yourself. Don't delegate unless user explicitly asks for implementation.

## Architecture & Key Patterns

### Tech Stack

- **Framework**: Next.js 15.5 with App Router
- **Styling**: Tailwind CSS 4 with Shadcn/UI components
- **Web3**: OnchainKit (Coinbase), Builder DAO SDK, Viem/Wagmi
- **Chain**: Base (chain ID 8453)
- **Package Manager**: pnpm

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Homepage
├── components/
│   └── ui/                # Shadcn/UI components
├── lib/
│   ├── config.ts          # DAO addresses and chain config
│   └── utils.ts           # Utility functions
└── hooks/                 # Custom React hooks (if needed)
```

### Key Configuration Files

- `components.json`: Shadcn/UI configuration (New York style, RSC enabled)
- `tsconfig.json`: TypeScript config with path mapping (`@/*` -> `./src/*`)
- `next.config.ts`: Next.js configuration
- `tailwind.config.*`: Tailwind CSS v4 configuration

### DAO Configuration

The `src/lib/config.ts` file contains all Gnars DAO contract addresses on Base:

- Token (NFT): `0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17`
- Auction: `0x494eaa55ecf6310658b8fc004b0888dcb698097f`
- Governor: `0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c`
- Treasury: `0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88`
- Metadata: `0xdc9799d424ebfdcf5310f3bad3ddcce3931d4b58`
- Lootbox (V4): `GNARS_ADDRESSES.lootbox` (update after each deploy)

### Lootbox (V4 Only)

The lootbox UI at `src/app/lootbox/page.tsx` is **V4‑only**:
- Uses `gnarsLootboxV4Abi`.
- Includes admin controls for VRF config, allowlist, deposits, withdrawals, and recovery.
- Shows wallet balances/allowances and listens for the `FlexOpened` event to show NFT win toasts.

## Development Guidelines

### Code Style

- Use TypeScript strictly
- Follow Next.js App Router patterns (Server Components by default, Client Components when needed)
- Use Shadcn/UI components for consistent styling
- Import from path aliases: `@/components`, `@/lib`, etc.

### Web3 Integration

- Chain configuration is hardcoded to Base (chain ID 8453)
- Use OnchainKit hooks and components for wallet interactions
- Builder DAO SDK (`@buildeross/hooks`, `@buildeross/sdk`) for DAO data
- All contract addresses are centralized in `src/lib/config.ts`

### Data Fetching

- Server Components for initial data loading (SEO, performance)
- Client Components only for interactive features (bidding, voting)
- Utilize Builder DAO subgraph for historical data
- OnchainKit for real-time blockchain data

### Responsive Design

- Mobile-first approach with Tailwind breakpoints
- Use Shadcn/UI responsive utilities
- Ensure all DAO features work on mobile devices

## Environment Variables

Required environment variables (see `.env.example`):

```
NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"
ALCHEMY_API_KEY=""
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=""
NEXT_PUBLIC_GOLDSKY_PROJECT_ID=""
```

## Important Notes

- This is a single-DAO focused site (Gnars only), not a multi-DAO platform
- Target deployment: Vercel with Next.js optimizations
- Follow security best practices - no secrets in client code
- Use Builder DAO's proven patterns and components where possible
- Don't run `pnpm build` unless explicitly asked

## Error Handling & Retries

When Codex fails, delegate a retry with full error context:

```markdown
TASK: [Original task]

PREVIOUS ATTEMPT:
- What was done: [summary of changes made]
- Error encountered: [exact error message]
- Files modified: [list]

CONTEXT: [Full original context]

REQUIREMENTS:
- Fix the error from the previous attempt
- [Original requirements]
```

**After 3 failed attempts:** Escalate to user with full context.

## Workflow Summary

```
User Request
    ↓
Is this an explicit implementation request?
    │
    ├─ NO (question/planning/discussion)
    │   └─ Claude answers directly
    │       ├── Use Read/Grep/Glob to research
    │       ├── Answer the question
    │       └── Done (no delegation)
    │
    └─ YES ("implement X", "build Y", "fix Z")
        └─ Claude delegates to Codex
            ├── Gather context (quick reads)
            ├── Build delegation prompt
            ├── Execute: codex exec --timeout 600 -o /tmp/codex_last_output.txt
            ├── Report summary to user
            └── On error: retry with full context (max 3 attempts)
```

## Model-Based Behavior

| Model | Behavior |
|-------|----------|
| **Opus/Sonnet** | Answer questions, plan, research. Only delegate when user explicitly asks for implementation. |
| **Haiku** | Can execute all tasks directly (cost-efficient). |

**Token efficiency principle:**

1. **Questions/Planning/Research** → Claude handles directly (no delegation)
2. **Explicit implementation requests** → Delegate to Codex only when asked
3. **Avoid unnecessary external calls** → Keep conversations lightweight

**Cost is about total tokens used, not just per-token price.** Unnecessary delegation wastes tokens on:
- Building prompts
- Passing context to external process
- Parsing responses
- Retry loops
