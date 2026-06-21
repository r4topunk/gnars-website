import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShopDetail, ShopDetailSkeleton } from "@/components/shop/ShopDetail";
import { getShopItemBySlug } from "@/services/shop";
import type { ShopItem } from "@/types/shop";

export const revalidate = 3600;

async function fetchShopItem(slug: string): Promise<ShopItem | null> {
  try {
    return await getShopItemBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch shop item:", error);
    return null;
  }
}

interface ShopItemPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: ShopItemPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const item = await fetchShopItem(slug);
  const t = await getTranslations({ locale, namespace: "metadata.shop" });

  if (!item) {
    return {
      title: t("notFoundTitle"),
      description: t("description"),
    };
  }

  const description = item.description || item.title;
  const imageUrl = item.images[0] || "https://gnars.com/logo-banner.jpg";
  const path = `/shop/${slug}`;
  const canonical = locale === "en" ? path : `/pt-br${path}`;

  return {
    title: `${item.title} | Gnars Shop`,
    description,
    alternates: {
      canonical,
      languages: {
        en: path,
        "pt-br": `/pt-br${path}`,
        "x-default": path,
      },
    },
    openGraph: {
      title: item.title,
      description,
      images: [imageUrl],
      type: "website",
      url: `https://gnars.com${canonical}`,
      siteName: "Gnars",
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ShopItemPage({ params }: ShopItemPageProps) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "shop" });
  const item = await fetchShopItem(slug);

  if (!item) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-2xl font-bold text-muted-foreground">{t("notFound.title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("notFound.description")}</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Suspense fallback={<ShopDetailSkeleton />}>
        <ShopDetail item={item} />
      </Suspense>
    </div>
  );
}
