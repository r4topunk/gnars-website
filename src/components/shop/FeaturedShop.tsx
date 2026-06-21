import Image from "next/image";
import { ArrowUpRight, Lock, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ShopItem } from "@/types/shop";
import { formatPrice, type ShopCardLabels } from "./shared";

function FeaturedCard({ item, labels }: { item: ShopItem; labels: ShopCardLabels }) {
  const cover = item.images[0];
  const price = formatPrice(item.priceUSD);
  const isExternal = item.type === "affiliate";
  const revealSoon = item.status === "coming-soon";

  const content = (
    <div className="group flex h-full flex-col">
      <div className="relative aspect-[4/3] w-full">
        <div className="pointer-events-none absolute inset-0 hidden dark:block [background:radial-gradient(circle_at_center,rgba(255,255,255,0.10),transparent_65%)]" />
        {cover && (
          <Image
            src={cover}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className={`object-contain p-4 drop-shadow-md transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-105 ${
              revealSoon ? "scale-90 opacity-40 blur-md" : ""
            }`}
          />
        )}
        {revealSoon && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <Lock className="h-6 w-6 text-muted-foreground" />
            <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold uppercase tracking-wide text-background">
              {labels.revealSoon}
            </span>
          </div>
        )}
        <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
          <Sparkles className="h-3 w-3" />
          {labels.featured}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-1 pt-3">
        {item.vendor && (
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {item.vendor}
          </span>
        )}
        <h3 className="mt-0.5 text-xl font-bold leading-tight transition-colors group-hover:text-primary">
          {item.title}
        </h3>
        <div className="mt-3 flex items-center justify-between">
          {price && <span className="text-lg font-bold">{price}</span>}
          <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
            {revealSoon ? labels.preview : isExternal ? labels.shopNow : labels.viewDetails}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );

  if (isExternal && item.externalUrl) {
    return (
      <a
        href={item.externalUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block cursor-pointer"
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={`/shop/${item.slug}`} className="block cursor-pointer">
      {content}
    </Link>
  );
}

export function FeaturedShop({
  items,
  labels,
  heading,
}: {
  items: ShopItem[];
  labels: ShopCardLabels;
  heading: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
        <Sparkles className="h-5 w-5 text-primary" />
        {heading}
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <FeaturedCard key={item.id} item={item} labels={labels} />
        ))}
      </div>
    </section>
  );
}
