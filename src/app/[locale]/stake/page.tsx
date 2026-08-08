import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StakePageContent } from "@/components/stake/StakePageContent";
import { STAKE_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.stake" });
  const path = "/stake";
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
    // Farcaster mini app embed — without this /stake inherits the root default
    // and launches the home miniapp instead of the rider select.
    other: {
      "fc:miniapp": JSON.stringify(STAKE_MINIAPP_EMBED_CONFIG),
    },
  };
}

export default async function StakePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="py-10">
      {/* max-w-6xl matches the site shell (Treasury, Auctions). The narrow measure
          that reading text needs is applied by the paragraphs themselves. */}
      <div className="mx-auto max-w-6xl">
        <StakePageContent />
      </div>
    </div>
  );
}
