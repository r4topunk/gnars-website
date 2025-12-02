import { MINIAPP_CONFIG } from "@/lib/miniapp-config";

/**
 * Farcaster Mini App Manifest
 *
 * This route serves the manifest at /.well-known/farcaster.json
 * Required for mini app verification and discovery
 *
 * See: https://docs.base.org/mini-apps/features/manifest
 */

function withValidProperties(
  properties: Record<string, undefined | string | string[] | object>
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "object" && value !== null) {
        return Object.values(value).some((v) => v !== "" && v !== undefined);
      }
      return !!value;
    })
  );
}

export async function GET() {
  const manifest = {
    // Account association for ownership verification
    // These fields are populated after signing at https://www.base.dev/preview?tab=account
    accountAssociation: MINIAPP_CONFIG.accountAssociation,

    // Base builder configuration (optional but recommended for builder rewards)
    ...(MINIAPP_CONFIG.baseBuilder.ownerAddress && {
      baseBuilder: MINIAPP_CONFIG.baseBuilder,
    }),

    // Mini app configuration
    miniapp: withValidProperties({
      version: MINIAPP_CONFIG.miniapp.version,
      name: MINIAPP_CONFIG.miniapp.name,
      subtitle: MINIAPP_CONFIG.miniapp.subtitle,
      description: MINIAPP_CONFIG.miniapp.description,
      homeUrl: MINIAPP_CONFIG.miniapp.homeUrl,
      iconUrl: MINIAPP_CONFIG.miniapp.iconUrl,
      splashImageUrl: MINIAPP_CONFIG.miniapp.splashImageUrl,
      splashBackgroundColor: MINIAPP_CONFIG.miniapp.splashBackgroundColor,
      webhookUrl: MINIAPP_CONFIG.miniapp.webhookUrl,
      primaryCategory: MINIAPP_CONFIG.miniapp.primaryCategory,
      tags: MINIAPP_CONFIG.miniapp.tags,
      screenshotUrls: MINIAPP_CONFIG.miniapp.screenshotUrls,
      heroImageUrl: MINIAPP_CONFIG.miniapp.heroImageUrl,
      tagline: MINIAPP_CONFIG.miniapp.tagline,
      ogTitle: MINIAPP_CONFIG.miniapp.ogTitle,
      ogDescription: MINIAPP_CONFIG.miniapp.ogDescription,
      ogImageUrl: MINIAPP_CONFIG.miniapp.ogImageUrl,
    }),
  };

  return Response.json(manifest, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
