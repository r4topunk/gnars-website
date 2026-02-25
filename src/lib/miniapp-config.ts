import { BASE_URL, DAO_DESCRIPTION } from "./config";

/**
 * Farcaster Mini App Configuration
 *
 * This configuration is used to generate the manifest at /.well-known/farcaster.json
 * and embed metadata for the mini app.
 *
 * After deploying, you need to:
 * 1. Go to https://www.base.dev/preview?tab=account
 * 2. Enter your app URL and click "Submit"
 * 3. Click "Verify" and sign the message with your Base account
 * 4. Copy the generated accountAssociation object and update below
 */

export const MINIAPP_CONFIG = {
  // Account association - MUST be filled in after signing at base.dev/preview
  // Leave empty strings until you've signed the manifest
  accountAssociation: {
    header: "eyJmaWQiOjUzODgzOSwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDk3Yjc4ZDdCM2M2NmMyZmZiOTYxYWEwQURCNmNlNjcyQTM3MTZEOEMifQ",
    payload: "eyJkb21haW4iOiJnbmFycy5jb20ifQ",
    signature: "qm+dqd4UcCOzjAYvNCDaoQOp1A4PoXAm9B6Qv6D4iJ9kzFZ4zjVpoL3s21y2UckqPC+QPO2/HkKuRzoU8GmV4xs=",
  },

  // Base builder configuration - add your Base account address
  baseBuilder: {
    ownerAddress: "" as `0x${string}` | "", // Add your Base account address here
  },

  // Mini app configuration
  miniapp: {
    version: "1",
    name: "Gnars DAO",
    subtitle: "Nounish Action Sports DAO",
    description: DAO_DESCRIPTION,
    homeUrl: BASE_URL,
    iconUrl: `${BASE_URL}/gnars.webp`,
    splashImageUrl: `${BASE_URL}/gnars-splash-200.png`,
    splashBackgroundColor: "#000000",
    // Webhook URL for notifications (optional - can be added later)
    webhookUrl: `${BASE_URL}/api/miniapp/webhook`,
    // App store metadata
    primaryCategory: "social" as const,
    tags: ["dao", "gnars", "governance", "nft", "base"],
    // Screenshots for app store (add actual screenshot URLs after taking them)
    screenshotUrls: [] as string[],
    // Hero image for app store listing (spec: 1200x630, 1.91:1)
    heroImageUrl: `${BASE_URL}/opengraph-image`,
    tagline: "Action sports DAO on Base",
    // Open Graph metadata
    ogTitle: "Gnars DAO",
    ogDescription: DAO_DESCRIPTION,
    // Spec: 1200x630 PNG
    ogImageUrl: `${BASE_URL}/opengraph-image`,
    // Set to true during development/testing, false when ready for public indexing
    noindex: false,
  },
} as const;

/**
 * Embed metadata configuration for fc:miniapp meta tag
 * This is used when the app is shared in Farcaster feeds
 */
export const MINIAPP_EMBED_CONFIG = {
  version: "1",
  imageUrl: `${BASE_URL}/miniapp-image`,
  button: {
    title: "Launch Gnars DAO",
    action: {
      type: "launch_miniapp" as const,
      name: "Gnars DAO",
      url: BASE_URL,
      splashImageUrl: `${BASE_URL}/gnars-splash-200.png`,
      splashBackgroundColor: "#000000",
    },
  },
};

/**
 * Check if the mini app configuration is complete
 * (has accountAssociation credentials)
 */
export function isMiniAppConfigured(): boolean {
  return Boolean(
    MINIAPP_CONFIG.accountAssociation.header &&
      MINIAPP_CONFIG.accountAssociation.payload &&
      MINIAPP_CONFIG.accountAssociation.signature
  );
}

/**
 * TV Mini App Configuration
 * Custom configuration for the Gnar TV video feed
 */
export const TV_MINIAPP_CONFIG = {
  accountAssociation: MINIAPP_CONFIG.accountAssociation,
  baseBuilder: MINIAPP_CONFIG.baseBuilder,
  miniapp: {
    version: "1",
    name: "Gnar TV",
    subtitle: "Creator Coins Feed",
    description:
      "Gnarliest Zora Video Feed of the worldwide web. Take the kids out of the living room, the stunts here are performed by complete retards.",
    homeUrl: `${BASE_URL}/tv`,
    iconUrl: `${BASE_URL}/gnars.webp`,
    splashImageUrl: `${BASE_URL}/tv-splash.png`,
    splashBackgroundColor: "#000000",
    webhookUrl: `${BASE_URL}/api/miniapp/webhook`,
    primaryCategory: "social" as const,
    tags: ["video", "creators", "coins", "zora", "gnars", "base"],
    screenshotUrls: [] as string[],
    // Spec: 1200x630, 1.91:1
    heroImageUrl: `${BASE_URL}/tv/opengraph-image`,
    tagline: "Video feed for creator coins",
    ogTitle: "Gnar TV - Creator Coins Feed",
    ogDescription:
      "Gnarliest Zora Video Feed of the worldwide web. Take the kids out of the living room, the stunts here are performed by complete retards.",
    // Spec: 1200x630 PNG
    ogImageUrl: `${BASE_URL}/tv/opengraph-image`,
    noindex: false,
  },
} as const;

/**
 * TV Embed metadata configuration for fc:miniapp meta tag
 */
export const TV_MINIAPP_EMBED_CONFIG = {
  version: "1",
  imageUrl: `${BASE_URL}/tv-og.gif`,
  button: {
    title: "Watch Gnar TV",
    action: {
      type: "launch_miniapp" as const,
      name: "Gnar TV",
      url: `${BASE_URL}/tv`,
      splashImageUrl: `${BASE_URL}/tv-splash.png`,
      splashBackgroundColor: "#000000",
    },
  },
};

/**
 * Proposals Mini App Configuration
 * Custom configuration for governance proposals
 */
export const PROPOSALS_MINIAPP_CONFIG = {
  accountAssociation: MINIAPP_CONFIG.accountAssociation,
  baseBuilder: MINIAPP_CONFIG.baseBuilder,
  miniapp: {
    version: "1",
    name: "Gnars Proposals",
    subtitle: "DAO Governance",
    description:
      "Browse and vote on Gnars DAO governance proposals. Participate in on-chain decision making for the action sports DAO.",
    homeUrl: `${BASE_URL}/proposals`,
    iconUrl: `${BASE_URL}/gnars.webp`,
    splashImageUrl: `${BASE_URL}/gnars-splash-200.png`,
    splashBackgroundColor: "#000000",
    webhookUrl: `${BASE_URL}/api/miniapp/webhook`,
    primaryCategory: "social" as const,
    tags: ["dao", "governance", "proposals", "voting", "gnars", "base"],
    screenshotUrls: [] as string[],
    heroImageUrl: `${BASE_URL}/opengraph-image`,
    tagline: "DAO governance on Base",
    ogTitle: "Gnars DAO Proposals",
    ogDescription:
      "Browse and vote on Gnars DAO governance proposals. Participate in on-chain decision making.",
    ogImageUrl: `${BASE_URL}/opengraph-image`,
    noindex: false,
  },
} as const;

/**
 * Proposals Embed metadata configuration for fc:miniapp meta tag
 */
export const PROPOSALS_MINIAPP_EMBED_CONFIG = {
  version: "1",
  imageUrl: `${BASE_URL}/miniapp-image`,
  button: {
    title: "View Proposals",
    action: {
      type: "launch_miniapp" as const,
      name: "Gnars Proposals",
      url: `${BASE_URL}/proposals`,
      splashImageUrl: `${BASE_URL}/gnars-splash-200.png`,
      splashBackgroundColor: "#000000",
    },
  },
};

/**
 * Members Mini App Configuration
 * Custom configuration for member profiles
 */
export const MEMBERS_MINIAPP_CONFIG = {
  accountAssociation: MINIAPP_CONFIG.accountAssociation,
  baseBuilder: MINIAPP_CONFIG.baseBuilder,
  miniapp: {
    version: "1",
    name: "Gnars Members",
    subtitle: "DAO Member Profiles",
    description:
      "Explore Gnars DAO member profiles, voting history, proposals, and creator coins. See who's building in the action sports DAO.",
    homeUrl: `${BASE_URL}/members`,
    iconUrl: `${BASE_URL}/gnars.webp`,
    splashImageUrl: `${BASE_URL}/gnars-splash-200.png`,
    splashBackgroundColor: "#000000",
    webhookUrl: `${BASE_URL}/api/miniapp/webhook`,
    primaryCategory: "social" as const,
    tags: ["dao", "members", "profiles", "gnars", "base", "creators"],
    screenshotUrls: [] as string[],
    heroImageUrl: `${BASE_URL}/opengraph-image`,
    tagline: "DAO member profiles on Base",
    ogTitle: "Gnars DAO Members",
    ogDescription:
      "Explore Gnars DAO member profiles and see who's building in the action sports DAO.",
    ogImageUrl: `${BASE_URL}/opengraph-image`,
    noindex: false,
  },
} as const;

/**
 * Members Embed metadata configuration for fc:miniapp meta tag
 */
export const MEMBERS_MINIAPP_EMBED_CONFIG = {
  version: "1",
  imageUrl: `${BASE_URL}/miniapp-image`,
  button: {
    title: "View Member",
    action: {
      type: "launch_miniapp" as const,
      name: "Gnars Members",
      url: `${BASE_URL}/members`,
      splashImageUrl: `${BASE_URL}/gnars-splash-200.png`,
      splashBackgroundColor: "#000000",
    },
  },
};

/**
 * Droposals Mini App Configuration
 * Custom configuration for NFT drop proposals (Droposals)
 */
export const DROPOSALS_MINIAPP_CONFIG = {
  accountAssociation: MINIAPP_CONFIG.accountAssociation,
  baseBuilder: MINIAPP_CONFIG.baseBuilder,
  miniapp: {
    version: "1",
    name: "Gnars Droposals",
    subtitle: "NFT Drop Proposals",
    description:
      "Explore and mint Gnars DAO Droposals - community-curated NFT editions created through governance proposals.",
    homeUrl: `${BASE_URL}/droposals`,
    iconUrl: `${BASE_URL}/gnars.webp`,
    splashImageUrl: `${BASE_URL}/gnars-splash-200.png`,
    splashBackgroundColor: "#000000",
    webhookUrl: `${BASE_URL}/api/miniapp/webhook`,
    primaryCategory: "social" as const,
    tags: ["dao", "nft", "drops", "editions", "gnars", "base", "zora"],
    screenshotUrls: [] as string[],
    heroImageUrl: `${BASE_URL}/logo-banner.jpg`,
    tagline: "NFT drops from the action sports DAO",
    ogTitle: "Gnars Droposals",
    ogDescription:
      "Explore and mint Gnars DAO Droposals - community-curated NFT editions created through governance proposals.",
    ogImageUrl: `${BASE_URL}/logo-banner.jpg`,
    noindex: false,
  },
} as const;

/**
 * Droposals Embed metadata configuration for fc:miniapp meta tag
 */
export const DROPOSALS_MINIAPP_EMBED_CONFIG = {
  version: "1",
  imageUrl: `${BASE_URL}/miniapp-image`,
  button: {
    title: "View Droposal",
    action: {
      type: "launch_miniapp" as const,
      name: "Gnars Droposals",
      url: `${BASE_URL}/droposals`,
      splashImageUrl: `${BASE_URL}/gnars-splash-200.png`,
      splashBackgroundColor: "#000000",
    },
  },
};

/**
 * Map Mini App Configuration
 * Custom configuration for the global Gnars locations map
 */
export const MAP_MINIAPP_CONFIG = {
  accountAssociation: MINIAPP_CONFIG.accountAssociation,
  baseBuilder: MINIAPP_CONFIG.baseBuilder,
  miniapp: {
    version: "1",
    name: "Gnars World Map",
    subtitle: "Global Gnars Locations",
    description:
      "Explore Gnars DAO funded skate spots, rails, and projects around the world. See where the action sports DAO has made an impact.",
    homeUrl: `${BASE_URL}/map`,
    iconUrl: `${BASE_URL}/gnars.webp`,
    splashImageUrl: `${BASE_URL}/gnars-splash-200.png`,
    splashBackgroundColor: "#000000",
    webhookUrl: `${BASE_URL}/api/miniapp/webhook`,
    primaryCategory: "social" as const,
    tags: ["dao", "map", "skate", "locations", "gnars", "base", "global"],
    screenshotUrls: [] as string[],
    heroImageUrl: `${BASE_URL}/map/opengraph-image`,
    tagline: "Global skate spots funded by Gnars DAO",
    ogTitle: "Gnars World Map",
    ogDescription:
      "Explore Gnars DAO funded skate spots, rails, and projects around the world.",
    ogImageUrl: `${BASE_URL}/map/opengraph-image`,
    noindex: false,
  },
} as const;

/**
 * Map Embed metadata configuration for fc:miniapp meta tag
 */
export const MAP_MINIAPP_EMBED_CONFIG = {
  version: "1",
  imageUrl: `${BASE_URL}/map/miniapp-image`,
  button: {
    title: "Explore Map",
    action: {
      type: "launch_miniapp" as const,
      name: "Gnars World Map",
      url: `${BASE_URL}/map`,
      splashImageUrl: `${BASE_URL}/gnars-splash-200.png`,
      splashBackgroundColor: "#000000",
    },
  },
};
