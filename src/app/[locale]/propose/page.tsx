import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LayoutTemplate } from "lucide-react";
import { ProposalWizard } from "@/components/proposals/ProposalWizard";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.propose" });
  const path = "/propose";
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

interface ProposePageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProposePage({ params }: ProposePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("propose");

  return (
    <div className="py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("page.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("page.description")}</p>
        </div>
        <Link
          href="/propose/templates"
          className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          <LayoutTemplate className="h-4 w-4" />
          {t("page.useTemplate")}
        </Link>
      </div>

      <Suspense>
        <ProposalWizard />
      </Suspense>
    </div>
  );
}
