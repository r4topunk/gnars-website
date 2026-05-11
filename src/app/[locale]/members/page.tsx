import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MembersList } from "@/components/members/MembersList";
import { MembersTableSkeleton } from "@/components/skeletons/members-table-skeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.members" });
  const path = "/members";
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

export const revalidate = 3600; // ISR with 1 hour revalidation

export default async function MembersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("members");

  return (
    <div className="py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("page.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("page.description")}</p>
        </div>

        <Suspense fallback={<MembersTableSkeleton />}>
          <MembersList showSearch={false} />
        </Suspense>
      </div>
    </div>
  );
}
