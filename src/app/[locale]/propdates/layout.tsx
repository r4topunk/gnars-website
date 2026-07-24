import type { Metadata } from "next";
import { PROPDATES_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";

// Adds this route's own Farcaster mini app embed so it launches here instead of
// inheriting the root default (which opens the home mini app). Metadata merges
// with the page's own title/description.
export function generateMetadata(): Metadata {
  return {
    other: {
      "fc:miniapp": JSON.stringify(PROPDATES_MINIAPP_EMBED_CONFIG),
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
