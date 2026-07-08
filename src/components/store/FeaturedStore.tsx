import Image from "next/image";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Product } from "@/types/store";
import { formatPrice, type StoreCardLabels } from "./shared";

function FeaturedCard({ product, labels }: { product: Product; labels: StoreCardLabels }) {
  const cover = product.images[0];

  return (
    <Link href={`/store/${product.slug}`} className="block cursor-pointer">
      <div className="group flex h-full flex-col">
        <div className="relative aspect-[4/3] w-full">
          <div className="pointer-events-none absolute inset-0 hidden dark:block [background:radial-gradient(circle_at_center,rgba(255,255,255,0.10),transparent_65%)]" />
          {cover && (
            <Image
              src={cover}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-contain p-4 drop-shadow-md transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-105"
            />
          )}
          <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
            <Sparkles className="h-3 w-3" />
            {labels.featured}
          </span>
        </div>

        <div className="flex flex-1 flex-col px-1 pt-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {product.brand}
          </span>
          <h3 className="mt-0.5 text-xl font-bold leading-tight transition-colors group-hover:text-primary">
            {product.title}
          </h3>
          <div className="mt-3 flex items-center justify-between">
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

export function FeaturedStore({
  products,
  labels,
  heading,
}: {
  products: Product[];
  labels: StoreCardLabels;
  heading: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
        <Sparkles className="h-5 w-5 text-primary" />
        {heading}
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <FeaturedCard key={product.id} product={product} labels={labels} />
        ))}
      </div>
    </section>
  );
}
