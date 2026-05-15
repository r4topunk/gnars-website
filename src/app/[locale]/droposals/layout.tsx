import type { Metadata } from "next";
import { BASE_URL } from "@/lib/config";
import { DROPOSALS_MINIAPP_CONFIG, DROPOSALS_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";

// Layout-level metadata carries Farcaster miniapp embed config.
// The page-level generateMetadata provides locale-aware title/description/alternates.
export const metadata: Metadata = {
  openGraph: {
    images: [DROPOSALS_MINIAPP_CONFIG.miniapp.ogImageUrl],
    type: "website",
    url: `${BASE_URL}/droposals`,
  },
  twitter: {
    card: "summary_large_image",
    images: [DROPOSALS_MINIAPP_CONFIG.miniapp.ogImageUrl],
  },
  other: {
    "fc:miniapp": JSON.stringify(DROPOSALS_MINIAPP_EMBED_CONFIG),
  },
};

export default function DroposalsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
