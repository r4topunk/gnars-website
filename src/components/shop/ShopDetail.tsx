"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { ShopItem } from "@/types/shop";
import { formatPrice } from "./shared";

export function ShopDetail({ item }: { item: ShopItem }) {
  const t = useTranslations("shop");
  const cover = item.images[0];
  const price = formatPrice(item.priceUSD);
  const isAffiliate = item.type === "affiliate";

  return (
    <div className="container mx-auto max-w-5xl px-4">
      <Link
        href="/shop"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("detail.backToShop")}
      </Link>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {cover && (
          <div className="relative aspect-square w-full">
            <div className="pointer-events-none absolute inset-0 hidden dark:block [background:radial-gradient(circle_at_center,rgba(255,255,255,0.10),transparent_65%)]" />
            <Image
              src={cover}
              alt={item.title}
              fill
              priority
              className="object-contain p-4 drop-shadow-md"
            />
          </div>
        )}

        <div className="flex flex-col">
          {item.vendor && (
            <span className="mb-1 text-sm uppercase tracking-wide text-muted-foreground">
              {item.vendor}
            </span>
          )}
          <h1 className="text-3xl font-bold">{item.title}</h1>

          <div className="mt-2 flex items-center gap-3">
            {price && <span className="text-2xl font-semibold">{price}</span>}
            {item.status === "sold-out" && <Badge variant="secondary">{t("card.soldOut")}</Badge>}
            {item.status === "coming-soon" && (
              <Badge variant="secondary">{t("card.comingSoon")}</Badge>
            )}
          </div>

          {item.description && <p className="mt-4 text-muted-foreground">{item.description}</p>}

          <div className="mt-8">
            {isAffiliate && item.externalUrl ? (
              <Button asChild size="lg">
                <a href={item.externalUrl} target="_blank" rel="noopener noreferrer sponsored">
                  {t("card.shopNow")}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button size="lg" disabled>
                {t("detail.checkoutComingSoon")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShopDetailSkeleton() {
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
