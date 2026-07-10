import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductDetail, ProductDetailSkeleton } from "@/components/store/ProductDetail";
import { isDropshipConfigured, isSandbox } from "@/services/keepkey-dropship";
import { getProductBySlug } from "@/services/store";
import type { Product } from "@/types/store";

export const revalidate = 3600;

async function fetchProduct(slug: string): Promise<Product | null> {
  try {
    return await getProductBySlug(slug);
  } catch (error) {
    console.error("Failed to fetch store product:", error);
    return null;
  }
}

interface ProductPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const product = await fetchProduct(slug);
  const t = await getTranslations({ locale, namespace: "metadata.store" });

  // TODO(store): remove `robots: noindex` here and on the listing page at launch.
  // Kept so the storefront stays hidden from search while it's WIP.
  const robots = { index: false, follow: false };

  if (!product) {
    return {
      title: t("notFoundTitle"),
      description: t("description"),
      robots,
    };
  }

  const description = product.description || product.title;
  const imageUrl = product.images[0] || "https://gnars.com/logo-banner.jpg";
  const path = `/store/${slug}`;
  const canonical = locale === "en" ? path : `/pt-br${path}`;

  return {
    title: `${product.title} | Gnars Store`,
    description,
    robots,
    alternates: {
      canonical,
      languages: {
        en: path,
        "pt-br": `/pt-br${path}`,
        "x-default": path,
      },
    },
    openGraph: {
      title: product.title,
      description,
      images: [imageUrl],
      type: "website",
      url: `https://gnars.com${canonical}`,
      siteName: "Gnars",
      locale: locale === "pt-br" ? "pt_BR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "store" });
  const product = await fetchProduct(slug);

  if (!product) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-2xl font-bold text-muted-foreground">{t("notFound.title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("notFound.description")}</p>
      </div>
    );
  }

  return (
    <div className="py-12">
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetail product={product} sandboxTools={isSandbox() && isDropshipConfigured()} />
      </Suspense>
    </div>
  );
}
