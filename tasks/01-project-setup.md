# Task: Project Setup & Configuration

This task covers the initial setup of the Next.js project, ensuring all configurations are explicit and optimized for agentic development.

### Sub-tasks:

- [ ] **Project Initialization**:
  - [ ] Initialize a new Next.js 15.5+ project: `pnpm create next-app@latest --typescript --tailwind --eslint`.
- [ ] **Dependency Installation**:
  - [ ] Install notification library: `pnpm add sonner`.
  - [ ] Install Coinbase's OnchainKit: `pnpm add @coinbase/onchainkit`.
  - [ ] Install Builder DAO libraries: `pnpm add @buildeross/hooks @buildeross/sdk`.
  - [ ] Install web3 utility libraries: `pnpm add viem wagmi`.
  - [ ] Install utility libraries for CSV export and form validation: `pnpm add papaparse zod`.
  - [ ] Install icon library: `pnpm add lucide-react`.
- [ ] **Environment Variables**:
  - [ ] Create an `.env.example` file with the following content:
    ```
    NEXT_PUBLIC_BASE_RPC_URL="https://mainnet.base.org"
    ALCHEMY_API_KEY=""
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="a665b7a1ea05f0d51371b097958fb3a9"
    ```
  - [ ] Create a `.env.local` file and populate it with your actual Alchemy key.
- [ ] **Configuration**:
  - [ ] **Root Layout**: In `src/app/layout.tsx`, import and add the `<Toaster />` component from `sonner` inside the `<body>` tag to enable global notifications.
  - [ ] **OnchainKit/Wagmi**: Wrap the root layout with `OnchainKitProvider` and configure it for the `base` chain, using the environment variables.
  - [ ] **Gnars DAO Config**: Create a central configuration file at `src/lib/config.ts`.
    - [ ] Add the official Nouns Builder Subgraph URL for Gnars on Base: `https://api.thegraph.com/subgraphs/name/nounsbuilder/gnars-dao-base-mainnet`.
    - [ ] Populate with the confirmed Gnars DAO contract addresses:
      - NFT (Token): `0x880fb3cf5c6cc2d7dfc13a993e839a9411200c17`
      - Auction House: `0x494eaa55ecf6310658b8fc004b0888dcb698097f`
      - Governor: `0x3dd4e53a232b7b715c9ae455f4e732465ed71b4c`
      - Treasury: `0x72ad986ebac0246d2b3c565ab2a1ce3a14ce6f88`
      - Metadata: `0xdc9799d424ebfdcf5310f3bad3ddcce3931d4b58`
    - [ ] Add the Gnars DAO description: "Nounish Open Source Action Sports Brand experiment ".

### References

- Builder chain IDs: `CHAIN_ID.BASE` `8453` and `BASE_SEPOLIA` `84532`:
  - `references/nouns-builder/packages/types/src/chain.ts`
- Builder Subgraph URL mapping (Base mainnet):
  - `references/nouns-builder/packages/constants/src/subgraph.ts`
- Builder SDK subgraph client connection (GraphQLClient):
  - `references/nouns-builder/packages/sdk/src/subgraph/client.ts`
