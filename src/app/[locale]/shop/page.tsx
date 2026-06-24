import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeaturedShop } from "@/components/shop/FeaturedShop";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { getAllShopItems, getFeaturedShopItems } from "@/services/shop";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.shop" });
  const path = "/shop";
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

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "shop" });
  const [items, featured] = await Promise.all([getAllShopItems(), getFeaturedShopItems()]);

  const labels = {
    shopNow: t("card.shopNow"),
    viewDetails: t("card.viewDetails"),
    soldOut: t("card.soldOut"),
    comingSoon: t("card.comingSoon"),
    featured: t("card.featured"),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t("description")}</p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed py-20 text-center">
            <p className="text-lg font-semibold">{t("empty.title")}</p>
            <p className="mt-2 text-muted-foreground">{t("empty.description")}</p>
          </div>
        ) : (
          <>
            <FeaturedShop items={featured} labels={labels} heading={t("featuredHeading")} />

            <section>
              <h2 className="mb-4 text-2xl font-bold">{t("allHeading")}</h2>
              <ShopGrid items={items} labels={labels} allLabel={t("filterAll")} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
