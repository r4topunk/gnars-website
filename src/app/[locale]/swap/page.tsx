import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BASE_URL } from "@/lib/config";
import { SWAP_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";
import { ChainSelector } from "./ChainSelector";
import { SwapChainProvider } from "./SwapChainContext";
import { SwapWidget } from "./SwapWidget";

const miniappImage = `${BASE_URL}/swap/miniapp-image`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.swap" });
  const path = "/swap";
  const canonical = locale === "en" ? path : `/pt-br${path}`;
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: {
        en: path,
        "pt-br": `/pt-br${path}`,
        "x-default": path,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: [miniappImage],
      url: `${BASE_URL}/swap`,
      type: "website",
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [miniappImage],
    },
    // Farcaster mini app embed metadata. Overrides the root layout's
    // `fc:miniapp` tag so casts that link to /swap render the swap-specific
    // cover and CTA instead of the generic Gnars DAO embed.
    other: {
      "fc:miniapp": JSON.stringify(SWAP_MINIAPP_EMBED_CONFIG),
    },
  };
}

export default async function SwapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("swap");

  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <SwapChainProvider>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
              <ChainSelector />
            </div>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>

          <SwapWidget />
        </SwapChainProvider>

        {/* Editorial copy — frames the swap as a contribution, not just a trade. */}
        <div className="mx-auto max-w-2xl space-y-3 border-t pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("editorial.tagline")}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t.rich("editorial.body", {
              highlight: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
