import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MuralBackground } from "@/components/layout/MuralBackground";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.mural" });
  const path = "/mural";
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

/**
 * Mural page
 * Displays the interactive mural with real Gnars NFTs in a draggable grid.
 */
export default async function MuralPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "mural" });

  return (
    <>
      <h1 className="sr-only">{t("srHeading")}</h1>
      <MuralBackground />
    </>
  );
}
