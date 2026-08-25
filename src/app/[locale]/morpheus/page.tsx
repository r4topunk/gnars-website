import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MorpheusPageContent } from "@/components/stake/MorpheusPageContent";

// The landing the Gnars subnet bio on the Morpheus site links to. Single
// purpose: explain the Gnars × Morpheus build to a cold visitor and let them
// stake from right here. /stake remains the multi-purpose staking page.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.morpheus" });
  const path = "/morpheus";
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
  };
}

export default async function MorpheusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="py-10">
      <MorpheusPageContent />
    </div>
  );
}
