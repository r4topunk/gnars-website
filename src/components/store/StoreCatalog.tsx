"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/store";
import { ProductCard } from "./ProductCard";
import type { StoreCardLabels } from "./shared";

interface StoreCatalogLabels {
  card: StoreCardLabels;
  allHeading: string;
  allLabel: string;
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

  const pill = (label: string, count: number, value: string | null) => {
    const selected = active === value;
    return (
      <button
        key={value ?? "all"}
        type="button"
        onClick={() => setActive(value)}
        aria-pressed={selected}
        className={cn(
          "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition",
          selected
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label} · {count}
      </button>
    );
  };

  return (
    <section id="all-products" className="mt-20 scroll-mt-24 md:mt-28">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-black tracking-tight md:text-4xl">{labels.allHeading}</h2>
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-border p-1">
          {pill(labels.allLabel, products.length, null)}
          {categories.map((category) => pill(category.name, category.count, category.name))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-6">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} labels={labels.card} />
        ))}
      </div>
    </section>
  );
}
