# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
NEXT_PUBLIC_ALCHEMY_API_KEY=""
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=""
NEXT_PUBLIC_GOLDSKY_PROJECT_ID=""
```

## Important Notes

- This is a single-DAO focused site (Gnars only), not a multi-DAO platform
- Target deployment: Vercel with Next.js optimizations
- Follow security best practices - no secrets in client code
- Use Builder DAO's proven patterns and components where possible
- don't run the pnpm build, you should run the build only when I asked you to do it
