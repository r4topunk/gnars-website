"use client";

import { useMemo, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/store";
import { getCategoryStyle } from "./categories";
import { ProductCard } from "./ProductCard";
import type { StoreCardLabels } from "./shared";

interface StoreCatalogLabels {
  card: StoreCardLabels;
  categoriesHeading: string;
  allHeading: string;
  allLabel: string;
}

function CategoryButton({
  label,
  count,
  selected,
  onClick,
  icon: Icon,
  className,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group flex min-w-[9rem] flex-1 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-sm transition sm:flex-none",
        className,
        selected
          ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
          : "opacity-90 hover:opacity-100 hover:shadow-md",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/25">
        <Icon className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs opacity-80">{count}</span>
      </span>
    </button>
  );
}

export function StoreCatalog({
  products,
  labels,
}: {
  products: Product[];
  labels: StoreCatalogLabels;
}) {
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count }));
  }, [products]);

  const [active, setActive] = useState<string | null>(null);
  const filtered = active ? products.filter((p) => p.category === active) : products;

  return (
    <>
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-bold">{labels.categoriesHeading}</h2>
        <div className="flex flex-wrap gap-3">
          <CategoryButton
            label={labels.allLabel}
            count={products.length}
            selected={active === null}
            onClick={() => setActive(null)}
            icon={LayoutGrid}
            className="bg-primary text-primary-foreground"
          />
          {categories.map((category, index) => {
            const style = getCategoryStyle(category.name, index);
            return (
              <CategoryButton
                key={category.name}
                label={category.name}
                count={category.count}
                selected={active === category.name}
                onClick={() => setActive(category.name)}
                icon={style.icon}
                className={style.className}
              />
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">{labels.allHeading}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} labels={labels.card} />
          ))}
        </div>
      </section>
    </>
  );
}
