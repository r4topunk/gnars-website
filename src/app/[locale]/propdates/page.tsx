import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PropdatesFeed } from "@/components/propdates/PropdatesFeed";
import { PropdatesFeedSkeleton } from "@/components/propdates/PropdatesFeedSkeleton";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.propdates" });
  const path = "/propdates";
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

export const revalidate = 60;

interface PropdatesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PropdatesPage({ params }: PropdatesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "propdates" });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("page.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("page.description")}{" "}
          <Link
            href="/proposals"
            className="text-foreground underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground transition-colors"
          >
            {t("page.viewProposals")}
          </Link>
        </p>
      </div>
      <Suspense fallback={<PropdatesFeedSkeleton />}>
        <PropdatesFeed />
      </Suspense>
    </div>
  );
}
