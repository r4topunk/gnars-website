"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Availability, Product, ProductVariant } from "@/types/store";
import { ProductVisual } from "./ProductVisual";
import { formatPrice } from "./shared";

function BackLink({ label }: { label: string }) {
  return (
    <Link
      href="/store"
      className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}

/** Purchase CTA + fulfillment note, shared by both layouts. Checkout is not built yet. */
function PurchaseActions({ product, soldOut }: { product: Product; soldOut: boolean }) {
  const t = useTranslations("store");
  return (
    <>
      {/*
        TODO(checkout): wire the primary CTA to a real checkout flow.
        Flow: Gnars checkout → fulfillment provider API (e.g. KeepKey) → provider ships.
        See docs/integrations/keepkey-fulfillment.md. Disabled until payment exists.
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
    </>
  );
}

function AvailabilityBadge({ availability }: { availability: Availability }) {
  const t = useTranslations("store");
  if (availability === "in_stock") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-emerald-500">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {t("card.inStock")}
      </span>
    );
  }
  const label =
    availability === "preorder"
      ? t("card.preorder")
      : availability === "coming_soon"
        ? t("card.comingSoon")
        : t("card.outOfStock");
  return (
    <Badge variant="secondary" className="uppercase tracking-wide">
      {label}
    </Badge>
  );
}

/** Two-panel layout for a 3D-device product with a color/finish selector. */
function DeviceProductDetail({ product }: { product: Product }) {
  const t = useTranslations("store");
  const variants = product.variants ?? [];
  const [selected, setSelected] = useState<ProductVariant>(variants[0]);

  const glow = selected?.colorHex ?? "#888888";
  const price = selected?.price ?? product.price;
  const availability = selected?.availability ?? product.availability;
  const soldOut = availability === "out_of_stock";

  return (
    <div className="container mx-auto max-w-5xl px-4">
      <BackLink label={t("detail.backToStore")} />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Stage */}
        <div
          className="relative flex min-h-[380px] flex-col overflow-hidden rounded-2xl border md:min-h-[520px]"
          style={{
            backgroundImage: [
              `radial-gradient(ellipse at 50% 52%, ${glow}40 0%, transparent 62%)`,
              "linear-gradient(rgba(128,128,128,0.12) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(128,128,128,0.12) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "cover, 32px 32px, 32px 32px",
          }}
        >
          <div className="flex items-center justify-between px-5 py-4 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span>{product.brand}</span>
            <AvailabilityBadge availability={availability} />
          </div>
          <div className="flex flex-1 items-center justify-center px-4 pb-6">
            <ProductVisual product={product} variantTitle={selected?.title} duration={14} />
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <span className="mb-1 text-sm uppercase tracking-wide text-muted-foreground">
            {product.category}
          </span>
          <h1 className="text-3xl font-bold">{product.title}</h1>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold">{formatPrice(price, product.currency)}</span>
            <span className="text-xs text-muted-foreground">{product.currency}</span>
          </div>

          <p className="mt-4 text-muted-foreground">{product.description}</p>

          {/* Color / finish selector */}
          <div className="mt-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("detail.finish")} — <span className="text-foreground">{selected?.title}</span>
            </p>
            <div className="flex flex-wrap gap-3">
              {variants.map((variant) => {
                const isSelected = variant.id === selected?.id;
                const disabled = variant.availability === "out_of_stock";
                return (
                  <button
                    key={variant.id}
                    type="button"
                    aria-label={`${variant.title}${isSelected ? " (selected)" : ""}`}
                    aria-pressed={isSelected}
                    title={variant.title}
                    disabled={disabled}
                    onClick={() => setSelected(variant)}
                    className={cn(
                      "h-9 w-9 rounded-full border-2 transition",
                      isSelected
                        ? "border-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "border-transparent hover:border-muted-foreground",
                      disabled ? "cursor-not-allowed opacity-35" : "cursor-pointer",
                    )}
                    style={{ background: variant.colorHex }}
                  />
                );
              })}
            </div>
          </div>

          <PurchaseActions product={product} soldOut={soldOut} />
        </div>
      </div>
    </div>
  );
}

/** Default layout for static-image products (with a simple thumbnail gallery). */
function StaticProductDetail({ product }: { product: Product }) {
  const t = useTranslations("store");
  const [activeImage, setActiveImage] = useState(0);
  const images = product.images;
  const cover = images[activeImage] ?? images[0];
  const soldOut = product.availability === "out_of_stock";

  return (
    <div className="container mx-auto max-w-5xl px-4">
      <BackLink label={t("detail.backToStore")} />

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

          <PurchaseActions product={product} soldOut={soldOut} />
        </div>
      </div>
    </div>
  );
}

export function ProductDetail({ product }: { product: Product }) {
  if (product.device3d && product.variants && product.variants.length > 0) {
    return <DeviceProductDetail product={product} />;
  }
  return <StaticProductDetail product={product} />;
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
