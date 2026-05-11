import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import dynamic from "next/dynamic";
import {
  MetricSkeleton,
  NftGridSkeleton,
  TableSkeleton,
} from "@/components/skeletons/treasury-skeletons";
import { NftHoldings } from "@/components/treasury/NftHoldings";
import { TokenHoldings } from "@/components/treasury/TokenHoldings";
import { TreasuryBalance } from "@/components/treasury/TreasuryBalance";
import { ZoraCoinHoldings } from "@/components/treasury/ZoraCoinHoldings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DAO_ADDRESSES } from "@/lib/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.treasury" });
  const path = "/treasury";
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

export const revalidate = 300;

const AuctionBidsPerMonthChart = dynamic(
  () =>
    import("@/components/treasury/AuctionBidsPerMonthChart").then((mod) => ({
      default: mod.AuctionBidsPerMonthChart,
    })),
  { loading: () => <div className="h-[300px] rounded-xl bg-muted animate-pulse" /> },
);
const ProposalsPerMonthChart = dynamic(
  () =>
    import("@/components/treasury/ProposalsPerMonthChart").then((mod) => ({
      default: mod.ProposalsPerMonthChart,
    })),
  { loading: () => <div className="h-[300px] rounded-xl bg-muted animate-pulse" /> },
);
const MemberActivityChart = dynamic(
  () =>
    import("@/components/treasury/MemberActivityChart").then((mod) => ({
      default: mod.MemberActivityChart,
    })),
  { loading: () => <div className="h-[300px] rounded-xl bg-muted animate-pulse" /> },
);

export default async function TreasuryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("treasury");

  return (
    <div className="py-8">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("page.title")}</h1>
          <p className="text-muted-foreground">{t("page.description")}</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("page.kpis.totalValue")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<MetricSkeleton />}>
                <TreasuryBalance treasuryAddress={DAO_ADDRESSES.treasury} />
              </Suspense>
            </CardContent>
          </Card>

          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("page.kpis.ethBalance")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<MetricSkeleton />}>
                <TreasuryBalance treasuryAddress={DAO_ADDRESSES.treasury} metric="eth" />
              </Suspense>
            </CardContent>
          </Card>

          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("page.kpis.totalAuctions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<MetricSkeleton />}>
                <TreasuryBalance treasuryAddress={DAO_ADDRESSES.treasury} metric="auctions" />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 min-w-0">
            <AuctionBidsPerMonthChart />
          </div>
          <div className="lg:col-span-1 min-w-0">
            <ProposalsPerMonthChart />
          </div>
          <div className="lg:col-span-1 min-w-0">
            <MemberActivityChart />
          </div>
        </div>

        {/* Token Holdings Table */}
        <Suspense fallback={<TableSkeleton />}>
          <TokenHoldings treasuryAddress={DAO_ADDRESSES.treasury} />
        </Suspense>

        {/* Zora Coin Holdings */}
        <Suspense fallback={<TableSkeleton />}>
          <ZoraCoinHoldings treasuryAddress={DAO_ADDRESSES.treasury} />
        </Suspense>

        {/* NFT Holdings Grid */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{t("page.nftSection.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("page.nftSection.description")}</p>
          </div>
          <Suspense fallback={<NftGridSkeleton />}>
            <NftHoldings treasuryAddress={DAO_ADDRESSES.treasury} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
