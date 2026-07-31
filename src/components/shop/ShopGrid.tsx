"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ShopItem } from "@/types/shop";
import type { ShopCardLabels } from "./shared";
import { ShopCard } from "./ShopCard";

export function ShopGrid({
  items,
  labels,
  allLabel,
}: {
  items: ShopItem[];
  labels: ShopCardLabels;
  allLabel: string;
}) {
  const vendors = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.vendor) set.add(item.vendor);
    }
    return Array.from(set);
  }, [items]);

  const [active, setActive] = useState<string | null>(null);

  const filtered = active ? items.filter((item) => item.vendor === active) : items;

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
      {vendors.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {chip(allLabel, null)}
          {vendors.map((vendor) => chip(vendor, vendor))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-4">
        {filtered.map((item) => (
          <ShopCard key={item.id} item={item} labels={labels} />
        ))}
      </div>
    </div>
  );
}
