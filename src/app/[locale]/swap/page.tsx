import type { Metadata } from "next";
import { BASE_URL } from "@/lib/config";
import { SWAP_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";
import { ChainSelector } from "./ChainSelector";
import { SwapChainProvider } from "./SwapChainContext";
import { SwapWidget } from "./SwapWidget";

const description =
  "Swap tokens across Base, Ethereum, Optimism, and Arbitrum with best execution across 150+ DEXes via the 0x Protocol.";

const miniappImage = `${BASE_URL}/swap/miniapp-image`;

export const metadata: Metadata = {
  title: "Swap — Gnars DAO",
  description,
  alternates: {
    canonical: "/swap",
  },
  openGraph: {
    title: "Swap — Gnars DAO",
    description,
    images: [miniappImage],
    url: `${BASE_URL}/swap`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Swap — Gnars DAO",
    description,
    images: [miniappImage],
  },
  // Farcaster mini app embed metadata. Overrides the root layout's
  // `fc:miniapp` tag so casts that link to /swap render the swap-specific
  // cover and CTA instead of the generic Gnars DAO embed.
  other: {
    "fc:miniapp": JSON.stringify(SWAP_MINIAPP_EMBED_CONFIG),
  },
};

export default function SwapPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <SwapChainProvider>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Swap</h1>
              <ChainSelector />
            </div>
            <p className="text-sm text-muted-foreground">
              Trade tokens with best execution across 150+ DEXes.
            </p>
          </div>

          <SwapWidget />
        </SwapChainProvider>

        {/* Editorial copy — frames the swap as a contribution, not just a trade. */}
        <div className="mx-auto max-w-2xl space-y-3 border-t pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Every swap is a small bet on shredding
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            With the <span className="font-medium text-foreground">Support Gnars treasury</span> box
            ticked, 0.5% of every trade routes straight to the Gnars Collective Treasury — already
            behind <span className="font-medium text-foreground">15 skatable sculptures</span>{" "}
            around the world, ambassador sponsorships, and infrastructure for a network of shredders
            from across the planet. You&apos;re not just swapping tokens; you&apos;re backing the
            culture and funding the next concrete pour, the next contest, the next session.
          </p>
        </div>
      </div>
    </div>
  );
}
