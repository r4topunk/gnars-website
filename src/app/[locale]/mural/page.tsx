import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MuralBackground } from "@/components/layout/MuralBackground";

export const metadata: Metadata = {
  title: "Mural — Gnars DAO",
  description: "Interactive community mural featuring Gnars NFT artwork in a draggable grid.",
  alternates: {
    canonical: "/mural",
  },
  openGraph: {
    title: "Mural — Gnars DAO",
    description: "Interactive community mural featuring Gnars NFT artwork in a draggable grid.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mural — Gnars DAO",
    description: "Interactive community mural featuring Gnars NFT artwork in a draggable grid.",
  },
};

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
