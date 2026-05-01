import type { Metadata } from "next";
import { SwapWidget } from "./SwapWidget";

const description =
  "Swap ETH, USDC, WETH, and the GNARS token on Base with best execution across 150+ DEXes via the 0x Protocol.";

export const metadata: Metadata = {
  title: "Swap — Gnars DAO",
  description,
  alternates: {
    canonical: "/swap",
  },
  openGraph: {
    title: "Swap — Gnars DAO",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Swap — Gnars DAO",
    description,
  },
};

export default function SwapPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Swap</h1>
          <p className="text-sm text-muted-foreground">
            Trade tokens on Base with best execution across 150+ DEXes.
          </p>
        </div>

        <SwapWidget />
      </div>
    </div>
  );
}
