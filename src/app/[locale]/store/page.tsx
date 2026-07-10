import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { StoreCardLabels } from "@/components/store/shared";
import { StoreCatalog } from "@/components/store/StoreCatalog";
import { StoreHero, type HeroStat } from "@/components/store/StoreHero";
import { getAllProducts } from "@/services/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.store" });
  const path = "/store";
  const canonical = locale === "en" ? path : `/pt-br${path}`;
  return {
    title: t("title"),
    description: t("description"),
    // TODO(store): remove `robots` (and re-add the header nav entry) at launch.
    // Kept noindex/nofollow so the storefront stays hidden from search while it's WIP.
    robots: { index: false, follow: false },
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
      siteName: "Gnars",
      type: "website",
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export const revalidate = 3600;

export default async function StorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "store" });
  const products = await getAllProducts();
  // Hero = the featured device product if present, else the first product.
  const heroProduct = products.find((p) => p.device3d && p.featured) ?? products[0];
  const categoryCount = new Set(products.map((p) => p.category)).size;

  const cardLabels: StoreCardLabels = {
    buy: t("card.buy"),
    viewDetails: t("card.viewDetails"),
    outOfStock: t("card.outOfStock"),
    preorder: t("card.preorder"),
    comingSoon: t("card.comingSoon"),
    featured: t("card.featured"),
  };

  const stats: HeroStat[] = [
    { value: String(products.length), label: t("hero.stats.products") },
    { value: String(categoryCount), label: t("hero.stats.categories") },
    { value: t("hero.stats.openBrandValue"), label: t("hero.stats.openBrandLabel"), accent: true },
  ];

  return (
    <div className="bg-background text-foreground">
      <div className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
        <StoreHero
          eyebrow={t("hero.eyebrow")}
          headline={t("hero.headline")}
          subtitle={t("hero.subtitle")}
          browseLabel={t("hero.browse")}
          featuredDropLabel={t("hero.featuredDrop")}
          featuredLabel={t("card.featured")}
          stats={stats}
          product={heroProduct}
        />

        {products.length === 0 ? (
          <div className="mt-16 rounded-xl border border-dashed border-border py-20 text-center">
            <p className="text-lg font-semibold">{t("empty.title")}</p>
            <p className="mt-2 text-muted-foreground">{t("empty.description")}</p>
          </div>
        ) : (
          <StoreCatalog
            products={products}
            labels={{
              card: cardLabels,
              allHeading: t("allHeading"),
              allLabel: t("filterAll"),
            }}
          />
        )}
      </div>
    </div>
  );
}
