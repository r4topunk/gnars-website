import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CoinProposalWizard } from "@/components/coin-proposal/CoinProposalWizard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.coinProposal" });
  const path = "/coin-proposal";
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

export default async function CoinProposalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("coinProposal");

  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("page.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("page.description")}</p>
      </div>

      <CoinProposalWizard />
    </div>
  );
}
