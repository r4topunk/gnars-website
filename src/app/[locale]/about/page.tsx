import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "About Gnars — Community-Owned Skateboarding Collective",
  description:
    "Gnars is a community-owned skateboarding collective and DAO that funds skate culture, skaters, and independent projects worldwide.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Gnars — Community-Owned Skateboarding Collective",
    description:
      "Gnars is a community-owned skateboarding collective and DAO that funds skate culture, skaters, and independent projects worldwide.",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Gnars — Community-Owned Skateboarding Collective",
    description:
      "Gnars is a community-owned skateboarding collective and DAO that funds skate culture, skaters, and independent projects worldwide.",
  },
};

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
