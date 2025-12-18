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
    splashImageUrl: `${BASE_URL}/gnars.webp`,
    splashBackgroundColor: "#000000",
    // Webhook URL for notifications (optional - can be added later)
    webhookUrl: `${BASE_URL}/api/miniapp/webhook`,
    // App store metadata
    primaryCategory: "social" as const,
    tags: ["dao", "gnars", "governance", "nft", "base"],
    // Screenshots for app store (add actual screenshot URLs after taking them)
    screenshotUrls: [] as string[],
    // Hero image for app store listing
    heroImageUrl: `${BASE_URL}/logo-banner.jpg`,
    tagline: "Action sports DAO on Base",
    // Open Graph metadata
    ogTitle: "Gnars DAO",
    ogDescription: DAO_DESCRIPTION,
    ogImageUrl: `${BASE_URL}/logo-banner.jpg`,
    // Set to true during development/testing, false when ready for public indexing
    noindex: true,
  },
} as const;

/**
 * Embed metadata configuration for fc:miniapp meta tag
 * This is used when the app is shared in Farcaster feeds
 */
export const MINIAPP_EMBED_CONFIG = {
  version: "next",
  imageUrl: `${BASE_URL}/logo-banner.jpg`,
  button: {
    title: "Launch Gnars DAO",
    action: {
      type: "launch_miniapp" as const,
      name: "Gnars DAO",
      url: BASE_URL,
      splashImageUrl: `${BASE_URL}/gnars.webp`,
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
    heroImageUrl: `${BASE_URL}/tv-og.png`,
    tagline: "Video feed for creator coins",
    ogTitle: "Gnar TV - Creator Coins Feed",
    ogDescription:
      "Gnarliest Zora Video Feed of the worldwide web. Take the kids out of the living room, the stunts here are performed by complete retards.",
    ogImageUrl: `${BASE_URL}/tv-og.png`,
    noindex: false,
  },
} as const;

/**
 * TV Embed metadata configuration for fc:miniapp meta tag
 */
export const TV_MINIAPP_EMBED_CONFIG = {
  version: "next",
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
