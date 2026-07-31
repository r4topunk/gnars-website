import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CheckoutFlow } from "@/components/store/CheckoutFlow";
import { isDropshipFulfillable } from "@/lib/store/fulfillment";
import { isSandbox } from "@/services/keepkey-dropship";
import { getProductBySlug } from "@/services/store";

export const dynamic = "force-dynamic";

interface CheckoutPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "store" });
  return { title: `${t("checkout.title")} | Gnars Store`, robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { slug, locale } = await params;
  setRequestLocale(locale);

  const product = await getProductBySlug(slug);
  // Only SKUs in KeepKey's dropship catalog have a real checkout today (see fulfillment.ts).
  if (!product || !isDropshipFulfillable(product.fulfillmentSku)) {
    notFound();
  }

  const finishes = (product.variants ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    disabled: v.availability === "out_of_stock",
  }));

  return (
    <div className="py-12">
      <CheckoutFlow
        slug={product.slug}
        title={product.title}
        price={product.price}
        currency={product.currency}
        finishes={finishes}
        sandbox={isSandbox()}
      />
    </div>
  );
}
