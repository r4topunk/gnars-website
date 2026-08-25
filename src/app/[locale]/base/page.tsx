import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BasePageContent, BaseUnderHood } from "@/components/base/BasePageContent";
import { GovSection } from "@/components/newhome/GovSection";
import { StakeSection } from "@/components/newhome/StakeSection";
import { SwapSection } from "@/components/newhome/SwapSection";

// The pitch page for Base ecosystem programs (Base Batches): everything Gnars
// runs on Base, with links to the live surfaces. See BasePageContent.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.base" });
  const path = "/base";
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

export default async function BasePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="py-10">
      <BasePageContent />
      {/* The proof: live production sections, not screenshots. GovSection is
          the daily auction + recent proposals + activity feed; SwapSection is
          the working 0x swap widget; StakeSection is the rider roster. */}
      <GovSection />
      <SwapSection />
      <StakeSection />
      <BaseUnderHood />
    </div>
  );
}
