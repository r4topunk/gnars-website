import type { Metadata } from "next";
import { MAP_MINIAPP_CONFIG, MAP_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";

const mapConfig = MAP_MINIAPP_CONFIG.miniapp;

export const metadata: Metadata = {
  title: "Gnars World Map",
  description: mapConfig.description,
  // Open Graph metadata for social sharing
  openGraph: {
    title: mapConfig.ogTitle,
    description: mapConfig.ogDescription,
    images: [mapConfig.ogImageUrl],
    type: "website",
    url: mapConfig.homeUrl,
  },
  // Twitter card metadata
  twitter: {
    card: "summary_large_image",
    title: mapConfig.ogTitle,
    description: mapConfig.ogDescription,
    images: [mapConfig.ogImageUrl],
  },
  // Farcaster mini app embed metadata
  other: {
    "fc:miniapp": JSON.stringify(MAP_MINIAPP_EMBED_CONFIG),
  },
};

export default function MapLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
