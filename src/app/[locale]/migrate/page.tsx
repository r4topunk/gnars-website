import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BASE_URL } from "@/lib/config";
import { MigrateTabs } from "./MigrateTabs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.migrate" });
  const path = "/migrate";
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
      url: `${BASE_URL}/migrate`,
      type: "website",
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
    },
  };
}

export default async function MigratePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("migrate");

  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <MigrateTabs />

        <div className="mx-auto max-w-2xl space-y-3 border-t pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("editorial.tagline")}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("editorial.body")}</p>
        </div>
      </div>
    </div>
  );
}
