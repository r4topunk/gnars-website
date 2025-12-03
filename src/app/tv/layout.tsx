import type { Metadata } from "next";
import { TV_MINIAPP_CONFIG, TV_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";

const tvConfig = TV_MINIAPP_CONFIG.miniapp;

export const metadata: Metadata = {
  title: "Gnars TV - Creator Coins Feed",
  description: tvConfig.description,
  // Open Graph metadata for social sharing
  openGraph: {
    title: tvConfig.ogTitle,
    description: tvConfig.ogDescription,
    images: [tvConfig.ogImageUrl],
    type: "website",
    url: tvConfig.homeUrl,
  },
  // Twitter card metadata
  twitter: {
    card: "summary_large_image",
    title: tvConfig.ogTitle,
    description: tvConfig.ogDescription,
    images: [tvConfig.ogImageUrl],
  },
  // Farcaster mini app embed metadata
  other: {
    "fc:miniapp": JSON.stringify(TV_MINIAPP_EMBED_CONFIG),
  },
};

export default function TVLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
