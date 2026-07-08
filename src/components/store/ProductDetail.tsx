"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/store";
import { formatPrice } from "./shared";

export function ProductDetail({ product }: { product: Product }) {
  const t = useTranslations("store");
  const [activeImage, setActiveImage] = useState(0);
  const images = product.images.length > 0 ? product.images : [];
  const cover = images[activeImage] ?? images[0];
  const soldOut = product.availability === "out_of_stock";

  return (
    <div className="container mx-auto max-w-5xl px-4">
      <Link
        href="/store"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("detail.backToStore")}
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          {cover && (
            <div className="relative aspect-square w-full">
              <div className="pointer-events-none absolute inset-0 hidden dark:block [background:radial-gradient(circle_at_center,rgba(255,255,255,0.10),transparent_65%)]" />
              <Image
                src={cover}
                alt={product.title}
                fill
                priority
                className="object-contain p-4 drop-shadow-md"
              />
            </div>
          )}
          {images.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`${product.title} image ${index + 1}`}
                  className={cn(
                    "relative aspect-square w-16 cursor-pointer overflow-hidden rounded-md border transition-colors",
                    index === activeImage
                      ? "border-primary"
                      : "border-border hover:border-foreground",
                  )}
                >
                  <Image src={image} alt="" fill sizes="64px" className="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <span className="mb-1 text-sm uppercase tracking-wide text-muted-foreground">
            {product.brand}
          </span>
          <h1 className="text-3xl font-bold">{product.title}</h1>

          <div className="mt-2 flex items-center gap-3">
            <span className="text-2xl font-semibold">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.availability === "out_of_stock" && (
              <Badge variant="secondary">{t("card.outOfStock")}</Badge>
            )}
            {product.availability === "preorder" && (
              <Badge variant="secondary">{t("card.preorder")}</Badge>
            )}
            {product.availability === "coming_soon" && (
              <Badge variant="secondary">{t("card.comingSoon")}</Badge>
            )}
          </div>

          <p className="mt-4 text-muted-foreground">{product.description}</p>

          {/*
            TODO(checkout): wire the primary CTA to a real checkout flow.
            The intended flow is: Gnars checkout → fulfillment provider API (e.g. KeepKey)
            → provider ships the product. See docs/integrations/keepkey-fulfillment.md.
            Until payment + order creation exist, the CTA stays disabled.
          */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" disabled>
              {soldOut ? t("card.outOfStock") : t("detail.checkoutComingSoon")}
            </Button>
            {product.externalProductUrl && (
              <Button asChild size="lg" variant="outline">
                <a href={product.externalProductUrl} target="_blank" rel="noopener noreferrer">
                  {t("detail.viewOnBrand", { brand: product.brand })}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {t("detail.fulfilledBy", { brand: product.brand })}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto max-w-5xl px-4">
      <div className="mb-6 h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="aspect-square w-full animate-pulse rounded-lg bg-muted" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-6 w-1/4 animate-pulse rounded bg-muted" />
          <div className="h-20 w-full animate-pulse rounded bg-muted" />
          <div className="h-11 w-40 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
