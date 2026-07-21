import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CharacterSelector } from "@/components/stake/CharacterSelector";

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
  };
}

export default async function StakePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("stake");

  return (
    <div className="py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {t("subtitle")}
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mx-auto max-w-xl text-muted-foreground">{t("intro")}</p>
        </div>

        <CharacterSelector />
      </div>
    </div>
  );
}
