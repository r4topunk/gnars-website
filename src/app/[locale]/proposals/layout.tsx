import type { Metadata } from "next";
import { PROPOSALS_MINIAPP_CONFIG, PROPOSALS_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";

const proposalsConfig = PROPOSALS_MINIAPP_CONFIG.miniapp;

// Layout-level metadata carries Farcaster miniapp embed config.
// The page-level generateMetadata provides locale-aware title/description/alternates.
export const metadata: Metadata = {
  // Open Graph metadata for social sharing
  openGraph: {
    images: [proposalsConfig.ogImageUrl],
    type: "website",
    url: proposalsConfig.homeUrl,
  },
  // Twitter card metadata
  twitter: {
    card: "summary_large_image",
    images: [proposalsConfig.ogImageUrl],
  },
  // Farcaster mini app embed metadata
  other: {
    "fc:miniapp": JSON.stringify(PROPOSALS_MINIAPP_EMBED_CONFIG),
  },
};

export default function ProposalsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
