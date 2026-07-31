import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Product } from "@/types/store";
import { ProductVisual } from "./ProductVisual";
import { formatPrice, type StoreCardLabels } from "./shared";

function availabilityBadge(product: Product, labels: StoreCardLabels) {
  switch (product.availability) {
    case "out_of_stock":
      return labels.outOfStock;
    case "preorder":
      return labels.preorder;
    case "coming_soon":
      return labels.comingSoon;
    default:
      return null;
  }
}

export function ProductCard({ product, labels }: { product: Product; labels: StoreCardLabels }) {
  const badge = availabilityBadge(product, labels);

  return (
    <Link href={`/store/${product.slug}`} className="block h-full cursor-pointer">
      <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-foreground/25">
        <div className="relative aspect-square w-full bg-popover">
          <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_45%,rgba(224,137,104,0.08),transparent_62%)]" />
          <ProductVisual
            product={product}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.03]"
            imageClassName="object-contain p-4 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.03]"
          />
          {badge && (
            <span className="absolute right-3 top-3 z-10 rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-foreground backdrop-blur">
              {badge}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {product.brand}
          </span>
          <h3 className="mt-1 text-base font-semibold leading-snug text-foreground">
            {product.title}
          </h3>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-lg font-bold text-foreground">
              {formatPrice(product.price, product.currency)}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-[#e08968]">
              {labels.viewDetails}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
