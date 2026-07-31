import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { ShopItem } from "@/types/shop";
import { formatPrice, type ShopCardLabels } from "./shared";

function CardInner({ item, labels }: { item: ShopItem; labels: ShopCardLabels }) {
  const cover = item.images[0];
  const price = formatPrice(item.priceUSD);
  const isExternal = item.type === "affiliate";

  return (
    <div className="group flex h-full flex-col">
      <div className="relative aspect-square w-full">
        <div className="pointer-events-none absolute inset-0 hidden dark:block [background:radial-gradient(circle_at_center,rgba(255,255,255,0.10),transparent_65%)]" />
        {cover && (
          <Image
            src={cover}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-2 drop-shadow-sm transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-105"
          />
        )}

        {item.status === "sold-out" && (
          <Badge className="absolute right-1 top-1" variant="secondary">
            {labels.soldOut}
          </Badge>
        )}
        {item.status === "coming-soon" && (
          <Badge className="absolute right-1 top-1" variant="secondary">
            {labels.comingSoon}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 pt-3">
        {item.vendor && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {item.vendor}
          </span>
        )}
        <h3 className="mt-0.5 text-base font-semibold leading-snug transition-colors group-hover:text-primary">
          {item.title}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          {price && <span className="text-lg font-bold">{price}</span>}
          <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
            {isExternal ? labels.shopNow : labels.viewDetails}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function ShopCard({ item, labels }: { item: ShopItem; labels: ShopCardLabels }) {
  if (item.type === "affiliate" && item.externalUrl) {
    return (
      <a
        href={item.externalUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block h-full cursor-pointer"
      >
        <CardInner item={item} labels={labels} />
      </a>
    );
  }

  return (
    <Link href={`/shop/${item.slug}`} className="block h-full cursor-pointer">
      <CardInner item={item} labels={labels} />
    </Link>
  );
}
