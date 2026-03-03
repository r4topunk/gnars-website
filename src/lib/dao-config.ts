/**
 * DAO Configuration
 *
 * This is the SINGLE file you need to edit when forking this website
 * for a different Nouns Builder DAO. All DAO-specific content lives here.
 *
 * To fork for your DAO:
 * 1. Update the values in this file with your DAO's info
 * 2. Update contract addresses in config.ts (GNARS_ADDRESSES)
 * 3. Update environment variables (.env.local)
 * 4. Deploy!
 */

export const DAO_CONFIG = {
  // DAO Identity
  name: "Gnars",
  tagline: "Community-Owned Skateboarding Collective",
  description: "Nounish Open Source Action Sports Brand experiment",

  // Homepage rotating descriptions
  homepageDescriptions: [
    "Nounish Open Source Action Sports Brand experiment",
    "Funding extreme sports athletes and creators worldwide",
    "Building the future of shredding",
    "Empowering athletes through collective governance",
    "Has funded 15 skatable sculptures around the world",
    "é foda pra caralho!",
  ] as const,

  // About page content
  about: {
    title: "About Gnars",
    metaTitle: "About Gnars — Community-Owned Skateboarding Collective",
    metaDescription:
      "Gnars is a community-owned skateboarding collective and DAO that funds skate culture, skaters, and independent projects worldwide.",
    sections: [
      {
        heading: null,
        content:
          "Gnars is a skateboarding collective and community owned skate brand. We're built by skaters, artists, and builders who want to fund skate culture without corporate gatekeeping. The DAO is just the tool we use to make the decisions together.",
      },
      {
        heading: "Community ownership in practice",
        content:
          "Members propose ideas, vote, and fund projects that push skateboarding forward—video parts, events, public installations, and the people making them happen. It's a community owned skate brand that stays accountable to the culture.",
      },
      {
        heading: "How it works",
        content:
          "Proposals are the way we decide what to support. Auctions help fund the treasury, and the community directs those resources to skateboarding grants and creative projects.",
      },
    ],
  },

  // Contract display names and descriptions
  contractDescriptions: {
    token: { name: "Token (NFT)", description: "Gnars NFT contract" },
    gnarsErc20: { name: "$GNARS (ERC20)", description: "$GNARS ERC20 token contract" },
    auction: { name: "Auction House", description: "Auction house contract" },
    governor: { name: "Governor", description: "Governance contract" },
    treasury: { name: "Treasury", description: "Treasury contract" },
    metadata: { name: "Metadata", description: "Metadata contract" },
  },

  // Navigation links
  navLinks: {
    home: "/",
    about: "/about",
    auctions: "/auctions",
    proposals: "/proposals",
    members: "/members",
    treasury: "/treasury",
  },

  // SEO / Metadata
  seo: {
    siteName: "Gnars DAO",
    defaultTitle: "Gnars DAO",
    defaultDescription: "Nounish Open Source Action Sports Brand experiment",
  },

  // Features toggle — enable/disable specific features for your DAO
  features: {
    droposals: true,
    lootbox: true,
    zoraCoin: true,
    map: true,
    mural: true,
    miniapp: true,
    blogs: true,
    tv: true,
    feed: true,
    propdates: true,
  },
} as const;
