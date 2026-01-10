# CLAUDE.md - Supervisor Agent

This file configures the main Claude agent as a supervisor that orchestrates specialized subagents for the Gnars DAO website project. The supervisor delegates tasks to appropriate subagents based on their expertise while maintaining overall project context and coordination.

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

## Planned Features (from task files)

The site will implement:

1. **DAO Overview Page** - Stats, metadata, navigation
2. **Auction System** - Current auction display, bidding, history
3. **Treasury Dashboard** - ETH balance, token holdings, transactions
4. **Proposal System** - Display proposals, voting interface, creation form
5. **Droposals** - Special NFT drop proposals with Zora integration
6. **Members & Delegates** - Member directory, delegation interface

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

## Reference Materials

The `references/` directory contains:

- `nouns-builder/` - Builder DAO monorepo for architectural patterns
- `gnars-terminal/` - Existing Gnars terminal interface
- `tasks/` - Detailed feature specifications and requirements

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
- don't run the pnpm build, you should run the build only when I asked you to do it

## Subagent Architecture

The project uses specialized subagents for different aspects of development. As the supervisor, delegate tasks to the appropriate subagent based on the work required:

### Available Subagents

1. **research-analyst** - Codebase discovery, pattern analysis, requirement gathering
2. **web3-specialist** - Smart contracts, wagmi/viem, blockchain interactions
3. **frontend-engineer** - React components, Next.js pages, UI implementation
4. **api-architect** - API routes, data fetching, caching strategies
5. **ui-designer** - Shadcn/ui components, Tailwind styling, design system
6. **docs-writer** - Documentation, README files, code comments

### Delegation Guidelines

**Use research-analyst when:**
- Starting new features or bug fixes
- Exploring unfamiliar parts of the codebase
- Understanding existing patterns before implementation
- Creating research.md documentation

**Use web3-specialist for:**
- Smart contract interactions
- Transaction building and encoding
- Wallet connection issues
- Blockchain data fetching
- ENS resolution

**Use frontend-engineer for:**
- Creating new pages or components
- Implementing forms and validation
- State management with React Query
- Client/Server component decisions

**Use api-architect for:**
- Creating or modifying API routes
- Implementing caching strategies
- Service layer architecture
- External API integrations

**Use ui-designer for:**
- Shadcn/ui component customization
- Tailwind CSS styling
- Responsive design implementation
- Design system consistency

**Use docs-writer for:**
- Creating or updating documentation
- Writing code comments
- Task documentation (research.md, plan.md)
- API documentation

### Workflow Patterns

1. **Feature Development:**
   - research-analyst → Creates research.md
   - Supervisor → Creates plan.md based on research
   - frontend-engineer + api-architect → Parallel implementation
   - ui-designer → Styling and polish
   - docs-writer → Documentation

2. **Bug Fixing:**
   - research-analyst → Identifies root cause
   - web3-specialist/frontend-engineer → Implements fix
   - docs-writer → Updates relevant documentation

3. **Web3 Features:**
   - research-analyst → Explores contracts and patterns
   - web3-specialist → Implements blockchain logic
   - frontend-engineer → Creates UI
   - api-architect → Adds caching if needed

### Context Management

- Each subagent starts with a clean context
- Pass critical information in task descriptions
- Use markdown files in tasks/ for context persistence
- Reference CLAUDE.md for project-wide conventions
- Leverage parallel execution for independent tasks
