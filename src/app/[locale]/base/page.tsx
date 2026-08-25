import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuctionDemoPanel } from "@/components/base/AuctionDemoPanel";
import { BasePageContent, BaseUnderHood } from "@/components/base/BasePageContent";
import { DroposalsGrid } from "@/components/droposals/DroposalsGrid";
import { GovSection } from "@/components/newhome/GovSection";
import { StakeSection } from "@/components/newhome/StakeSection";
import { SwapSection } from "@/components/newhome/SwapSection";
import { DAO_ADDRESSES } from "@/lib/config";
import { fetchRecentAuctions } from "@/services/auctions";
import { fetchDroposals } from "@/services/droposals";
import { loadTreasurySnapshot } from "@/services/treasury";

// The pitch page for Base ecosystem programs (Base Batches): everything Gnars
// runs on Base, with links to the live surfaces. See BasePageContent.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.base" });
  const path = "/base";
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

export default async function BasePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "base" });

  // The freshest four drops are enough for the pitch; /droposals has them all.
  // The auction card runs in DEMO mode: real settled auctions replayed, plus the
  // real cumulative auction revenue from the treasury snapshot — a fresh live
  // auction at 0.000 ETH sells nothing.
  const [droposals, pastAuctions, treasury] = await Promise.all([
    fetchDroposals(4).catch(() => []),
    fetchRecentAuctions(8).catch(() => []),
    loadTreasurySnapshot(DAO_ADDRESSES.treasury).catch(() => ({ totalAuctionSales: 0 })),
  ]);

  return (
    <div className="py-10">
      <BasePageContent />
      {/* The proof: live production sections, not screenshots. GovSection is
          the daily auction + recent proposals + activity feed; SwapSection is
          the working 0x swap widget; StakeSection is the rider roster. */}
      <GovSection
        auction={
          <AuctionDemoPanel items={pastAuctions} totalSalesEth={treasury.totalAuctionSales} />
        }
      />
      {droposals.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-4 pb-4 pt-10 sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t("features.droposals.title")}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {t("features.droposals.desc")}
          </p>
          <div className="mt-5">
            <DroposalsGrid items={droposals} />
          </div>
        </section>
      )}
      <SwapSection />
      <StakeSection />
      <BaseUnderHood />
    </div>
  );
}
