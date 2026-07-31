import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BASE_URL } from "@/lib/config";
import { MIGRATE_MINIAPP_EMBED_CONFIG } from "@/lib/miniapp-config";
import { MigrateTabs } from "./MigrateTabs";

const miniappImage = `${BASE_URL}/migrate/miniapp-image`;

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
      images: [miniappImage],
      url: `${BASE_URL}/migrate`,
      type: "website",
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [miniappImage],
    },
    // Farcaster mini app embed metadata — a cast linking to /migrate renders
    // the migration cover + a "Migrate to $gnars" launch button. The global
    // MiniAppReady (in [locale]/layout.tsx) handles sdk.actions.ready().
    other: {
      "fc:miniapp": JSON.stringify(MIGRATE_MINIAPP_EMBED_CONFIG),
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
