import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MembersList } from "@/components/members/MembersList";
import { MembersTableSkeleton } from "@/components/skeletons/members-table-skeleton";

export const metadata: Metadata = {
  title: "Members — Gnars DAO",
  description:
    "Browse all Gnars DAO members and their voting delegates. See who holds Gnars NFTs and how governance power is distributed across the community.",
  alternates: {
    canonical: "/members",
  },
  openGraph: {
    title: "Members — Gnars DAO",
    description:
      "Browse all Gnars DAO members and their voting delegates. See who holds Gnars NFTs and how governance power is distributed across the community.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Members — Gnars DAO",
    description:
      "Browse all Gnars DAO members and their voting delegates. See who holds Gnars NFTs and how governance power is distributed across the community.",
  },
};

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
