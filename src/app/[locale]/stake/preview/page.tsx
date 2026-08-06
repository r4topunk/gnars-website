import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { parsePreviewConfig } from "@/components/stake/preview/preview-config";
import { PreviewToolbar } from "@/components/stake/preview/PreviewToolbar";
import { StakePreview } from "@/components/stake/preview/StakePreview";
import { getRider, type RiderId } from "@/lib/gnars-vaults";

// Prototype route for the /stake redesign review. NOT the shipping page.
//
// The segment is "preview" and not "v2" on purpose: "v2" is a real RiderId with a
// deployed vault, so a static /stake/v2 segment would win over the [rider] dynamic
// route and shadow that rider's page, OG image and Farcaster embed.
//
// noindex — this is an internal review surface, not content.
export const metadata: Metadata = {
  title: "Stake: layout prototype",
  robots: { index: false, follow: false },
};

export default async function StakePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const config = parsePreviewConfig(sp);

  // ?rider=vlad previews the deep-link entry (the canonical path for the drop:
  // cast → per-rider embed → webview), not just the cold /stake landing.
  const riderParam = Array.isArray(sp.rider) ? sp.rider[0] : sp.rider;
  const rider = riderParam && getRider(riderParam) ? (riderParam as RiderId) : undefined;

  return (
    <div className="py-10">
      {/* max-w-6xl matches the site shell (Treasury, Auctions). The narrow measure
          that reading text needs is applied by the paragraphs themselves. */}
      <div className="mx-auto max-w-6xl">
        <PreviewToolbar config={config} />
        <StakePreview config={config} rider={rider} />
      </div>
    </div>
  );
}
