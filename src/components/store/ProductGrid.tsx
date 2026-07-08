"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/store";
import { ProductCard } from "./ProductCard";
import type { StoreCardLabels } from "./shared";

export function ProductGrid({
  products,
  labels,
  allLabel,
}: {
  products: Product[];
  labels: StoreCardLabels;
  allLabel: string;
}) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const product of products) set.add(product.category);
    return Array.from(set);
  }, [products]);

  const [active, setActive] = useState<string | null>(null);
  const filtered = active ? products.filter((product) => product.category === active) : products;

  const chip = (label: string, value: string | null) => {
    const selected = active === value;
    return (
      <button
        key={value ?? "all"}
        type="button"
        onClick={() => setActive(value)}
        className={cn(
          "cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-pressed={selected}
      >
        {label}
      </button>
    );
  };

  return (
    <div>
      {categories.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {chip(allLabel, null)}
          {categories.map((category) => chip(category, category))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-4">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} labels={labels} />
        ))}
      </div>
    </div>
  );
}
