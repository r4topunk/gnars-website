import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AUCTIONS_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata.auctions" });
  const path = "/auctions";
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
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    other: {
      "fc:miniapp": JSON.stringify(AUCTIONS_MINIAPP_EMBED_CONFIG),
    },
  };
}

export default function AuctionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
