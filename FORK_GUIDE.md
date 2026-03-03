# Forking Gnars Website for Your Nouns Builder DAO

This website is designed to be easily forkable for any Nouns Builder DAO. Follow this guide to create your own DAO website.

## 📋 Prerequisites

- Node.js 18+ and pnpm
- A Nouns Builder DAO deployed on Base (mainnet or Sepolia)
- Contract addresses for your DAO (Token, Auction, Governor, Treasury, Metadata)
- API keys for services (optional but recommended)

## 🚀 Quick Start (5 minutes)

### 1. Clone & Install

```bash
git clone https://github.com/r4topunk/gnars-website.git my-dao-website
cd my-dao-website
pnpm install
```

### 2. Configure Your DAO

Edit **`src/lib/dao-config.ts`** — This is the ONLY file you need to edit for basic customization:

```typescript
export const DAO_CONFIG = {
  // DAO Identity
  name: "Your DAO Name",
  tagline: "Your DAO Tagline",
  description: "Your DAO description",

  // Homepage rotating descriptions
  homepageDescriptions: [
    "Your first description",
    "Your second description",
    // Add more...
  ],

  // About page content
  about: {
    title: "About Your DAO",
    metaTitle: "About Your DAO — Tagline",
    metaDescription: "SEO description for your about page",
    sections: [
      {
        heading: null, // or "Section Title"
        content: "Your DAO's story...",
      },
      // Add more sections...
    ],
  },

  // Contract display names
  contractDescriptions: {
    token: { name: "Token (NFT)", description: "Your DAO NFT contract" },
    auction: { name: "Auction House", description: "Auction contract" },
    governor: { name: "Governor", description: "Governance contract" },
    treasury: { name: "Treasury", description: "Treasury contract" },
    metadata: { name: "Metadata", description: "Metadata contract" },
  },

  // SEO
  seo: {
    siteName: "Your DAO",
    defaultTitle: "Your DAO — Tagline",
    defaultDescription: "Your DAO description",
  },

  // Features toggle
  features: {
    droposals: false, // Gnars-specific feature
    lootbox: false,   // Gnars-specific feature
    zoraCoin: false,  // Gnars-specific feature
    map: false,       // Gnars-specific feature
    mural: false,     // Gnars-specific feature
    miniapp: false,   // Farcaster miniapp
    blogs: false,     // Blog feature
    tv: false,        // Gnars TV feature
    feed: true,       // Activity feed
    propdates: true,  // Proposal updates
  },
};
```

### 3. Set Contract Addresses

Edit **`src/lib/config.ts`**:

```typescript
export const GNARS_ADDRESSES = {
  token: "0xYourTokenAddress",
  auction: "0xYourAuctionAddress",
  governor: "0xYourGovernorAddress",
  treasury: "0xYourTreasuryAddress",
  metadata: "0xYourMetadataAddress",
} as const;

// Update chain if needed
export const CHAIN = {
  id: 8453,        // Base mainnet
  // id: 84532,    // Base Sepolia (for testing)
  name: "base",    // or "base-sepolia"
} as const;
```

### 4. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp env.example .env.local
```

Edit `.env.local`:

```env
# Site Configuration
NEXT_PUBLIC_SITE_URL=https://yourdao.com
NEXT_PUBLIC_CHAIN_ID=8453

# Blockchain & RPC
ALCHEMY_API_KEY=your_alchemy_api_key
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key

# Subgraph (Goldsky)
NEXT_PUBLIC_GOLDSKY_PROJECT_ID=project_cm33ek8kjx6pz010i2c3w8z25

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Optional: Zora API (for coins features)
# NEXT_PUBLIC_ZORA_API_KEY=your_zora_api_key
```

### 5. Test Locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and verify:
- DAO name and branding are correct
- Contract addresses are correct (check `/contracts` page or homepage)
- Proposals load correctly
- Auctions display correctly

### 6. Deploy to Vercel

```bash
vercel deploy
```

Or connect your GitHub repo to Vercel for automatic deployments.

## 🎨 Advanced Customization

### Branding & Styling

- **Colors**: Edit `tailwind.config.ts`
- **Fonts**: Update font imports in `src/app/layout.tsx`
- **Logo**: Replace images in `public/` directory
- **Favicon**: Replace `src/app/favicon.ico`

### Custom Features

#### Disable Gnars-Specific Features

In `dao-config.ts`, set features to `false`:

```typescript
features: {
  droposals: false,
  lootbox: false,
  zoraCoin: false,
  map: false,
  mural: false,
  miniapp: false,
  blogs: false,
  tv: false,
}
```

#### Add Custom Pages

Create new pages in `src/app/your-page/page.tsx`:

```typescript
import type { Metadata } from "next";
import { DAO_CONFIG } from "@/lib/dao-config";

export const metadata: Metadata = {
  title: `Your Page — ${DAO_CONFIG.name}`,
  description: "Your page description",
};

export default function YourPage() {
  return <div>Your content</div>;
}
```

### Subgraph Configuration

If you need a custom subgraph URL:

1. Update `NEXT_PUBLIC_GOLDSKY_PROJECT_ID` in `.env.local`
2. Or directly update `SUBGRAPH.url` in `src/lib/config.ts`

## 📦 What's Included

### Core Features (Always Available)

- ✅ Auctions (current & past)
- ✅ Proposals (create, vote, execute)
- ✅ Members (token holders & delegates)
- ✅ Treasury (balance, tokens, performance)
- ✅ Activity feed
- ✅ Proposal updates

### Optional Features (Can be disabled)

- 🎯 Droposals (Gnars-specific)
- 🎁 Lootbox (Gnars-specific)
- 🪙 Zora Coins integration
- 🗺️ Map (Gnars skate spots)
- 🎨 Mural background
- 📱 Farcaster miniapp
- 📝 Blogs
- 📺 Gnars TV

## 🔧 Troubleshooting

### Build Errors

**"Module not found" errors for Gnars features:**
- Make sure you disabled the features in `dao-config.ts`
- Remove unused routes (e.g., `src/app/map`, `src/app/lootbox`)

**Chain ID type errors:**
- Update `useVotes` hook type in `src/hooks/useVotes.ts` to accept `number` instead of specific chain ID

### No Data Loading

**Proposals/Auctions not loading:**
- Verify `NEXT_PUBLIC_GOLDSKY_PROJECT_ID` in `.env.local`
- Check contract addresses in `config.ts`
- Verify your DAO is indexed by Goldsky (Nouns Builder DAOs are indexed automatically)

**Treasury not showing correct balance:**
- Update `TREASURY_TOKEN_ALLOWLIST` in `config.ts` with your chain's token addresses
- For Base Sepolia, you may need to adjust token addresses

## 📝 Checklist

Before deploying:

- [ ] Updated `dao-config.ts` with your DAO's info
- [ ] Updated contract addresses in `config.ts`
- [ ] Set correct chain ID (mainnet vs Sepolia)
- [ ] Configured `.env.local` with API keys
- [ ] Disabled Gnars-specific features (if not using)
- [ ] Tested locally (`pnpm dev`)
- [ ] Verified contracts page shows correct addresses
- [ ] Verified proposals load correctly
- [ ] Verified auctions display correctly
- [ ] Updated branding/colors (optional)
- [ ] Added custom domain (optional)

## 🆘 Support

- [Nouns Builder Docs](https://docs.nouns.build/)
- [OpenClaw Community](https://discord.com/invite/clawd)
- [Create an issue](https://github.com/r4topunk/gnars-website/issues)

## 📄 License

MIT License - Feel free to fork and customize!

---

**Made with ❤️ by the Gnars DAO community**
