import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
      <div className="group flex h-full flex-col">
        <div className="relative aspect-square w-full">
          <div className="pointer-events-none absolute inset-0 hidden dark:block [background:radial-gradient(circle_at_center,rgba(255,255,255,0.10),transparent_65%)]" />
          <ProductVisual
            product={product}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-105"
            imageClassName="object-contain p-2 drop-shadow-sm transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-105"
          />
          {badge && (
            <Badge className="absolute right-1 top-1 z-10" variant="secondary">
              {badge}
            </Badge>
          )}
        </div>

        <div className="flex flex-1 flex-col px-1 pt-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {product.brand}
          </span>
          <h3 className="mt-0.5 text-base font-semibold leading-snug transition-colors group-hover:text-primary">
            {product.title}
          </h3>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-bold">
              {formatPrice(product.price, product.currency)}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
              {labels.viewDetails}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
