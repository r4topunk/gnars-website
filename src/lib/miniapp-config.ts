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
    header: "",
    payload: "",
    signature: "",
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
    splashImageUrl: `${BASE_URL}/logo-banner.jpg`,
    splashBackgroundColor: "#000000",
    // Webhook URL for notifications (optional - can be added later)
    webhookUrl: `${BASE_URL}/api/miniapp/webhook`,
    // App store metadata
    primaryCategory: "social" as const,
    tags: ["dao", "gnars", "governance", "nft", "action-sports", "base"],
    // Screenshots for app store (add actual screenshot URLs after taking them)
    screenshotUrls: [] as string[],
    // Hero image for app store listing
    heroImageUrl: `${BASE_URL}/logo-banner.jpg`,
    tagline: "Community-owned action sports brand",
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
      splashImageUrl: `${BASE_URL}/logo-banner.jpg`,
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
