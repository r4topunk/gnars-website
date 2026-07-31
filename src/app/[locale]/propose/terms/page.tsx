import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  PROPOSAL_COMMITMENT_CLAUSES,
  PROPOSAL_COMMITMENT_VERSION,
} from "@/lib/proposal-commitment";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.proposeTerms" });
  const path = "/propose/terms";
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
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

interface ProposeTermsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProposeTermsPage({ params }: ProposeTermsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("propose.terms");

  return (
    <div className="py-8">
      <article className="max-w-2xl mx-auto">
        <header>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-2 text-balance">{t("subtitle")}</p>
        </header>

        <p className="mt-6">{t("intro")}</p>

        <p className="mt-6 border-l-2 border-primary pl-4 text-muted-foreground italic">
          {t("callout")}
        </p>

        <ol className="mt-8 space-y-6">
          {PROPOSAL_COMMITMENT_CLAUSES.map((clause, index) => (
            <li key={clause} className="flex gap-4">
              <span
                aria-hidden
                className="shrink-0 font-mono text-sm text-muted-foreground pt-0.5 tabular-nums"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="space-y-1">
                <h2 className="font-semibold">{t(`clauses.${clause}.title`)}</h2>
                <p className="text-muted-foreground text-pretty">{t(`clauses.${clause}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>

        <footer className="mt-10 border-t pt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="font-mono text-muted-foreground">
            {t("versionLabel", { version: PROPOSAL_COMMITMENT_VERSION })}
          </span>
          <Link
            href="/propose"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToPropose")}
          </Link>
        </footer>
      </article>
    </div>
  );
}
