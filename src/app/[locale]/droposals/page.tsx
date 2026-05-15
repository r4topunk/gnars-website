import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DroposalsGrid } from "@/components/droposals/DroposalsGrid";
import { Link } from "@/i18n/navigation";
import { fetchDroposals } from "@/services/droposals";

export const revalidate = 1800; // 30 minutes

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.droposals" });
  const path = "/droposals";
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

export default async function DroposalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("droposals");

  const items = await fetchDroposals(24);

  return (
    <div className="py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
        <p className="text-muted-foreground mt-2">
          {t.rich("linkDescription", {
            fundingLink: (chunks) => (
              <Link href="/proposals" className="text-foreground underline underline-offset-4">
                {chunks}
              </Link>
            ),
            aboutLink: (chunks) => (
              <Link href="/about" className="text-foreground underline underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
      <DroposalsGrid items={items} />
    </div>
  );
}
