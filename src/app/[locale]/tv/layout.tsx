import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TV_MINIAPP_CONFIG, TV_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";

const tvConfig = TV_MINIAPP_CONFIG.miniapp;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.tv" });
  const path = "/tv";
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
    // Open Graph metadata for social sharing
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: [tvConfig.ogImageUrl],
      type: "website",
      url: tvConfig.homeUrl,
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
    },
    // Twitter card metadata
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [tvConfig.ogImageUrl],
    },
    // Farcaster mini app embed metadata
    other: {
      "fc:miniapp": JSON.stringify(TV_MINIAPP_EMBED_CONFIG),
    },
  };
}

export default function TVLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="overflow-hidden">{children}</div>;
}
