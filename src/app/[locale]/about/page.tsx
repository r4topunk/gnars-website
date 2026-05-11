import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.about" });
  const path = "/about";
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

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("about");

  return (
    <div className="py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>

        <p className="text-muted-foreground">{t("intro")}</p>

        <h2 className="text-2xl font-semibold">{t("ownership.title")}</h2>
        <p className="text-muted-foreground">{t("ownership.body")}</p>

        <h2 className="text-2xl font-semibold">{t("howItWorks.title")}</h2>
        <p className="text-muted-foreground">{t("howItWorks.body")}</p>

        <div className="flex flex-wrap gap-4">
          <Link href="/" className="text-foreground underline underline-offset-4">
            {t("links.home")}
          </Link>
          <Link href="/proposals" className="text-foreground underline underline-offset-4">
            {t("links.proposals")}
          </Link>
          <Link href="/auctions" className="text-foreground underline underline-offset-4">
            {t("links.auctions")}
          </Link>
        </div>
      </div>
    </div>
  );
}
