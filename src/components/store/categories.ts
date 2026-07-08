import { Cpu, Home, Package, Shirt, Sparkles, Watch, type LucideIcon } from "lucide-react";

/**
 * Visuals for the category cards on /store. Icons are matched by category name;
 * colors are assigned deterministically by position so any new category still
 * gets a distinct, readable card without extra config.
 */

const ICONS: Record<string, LucideIcon> = {
  hardware: Cpu,
  apparel: Shirt,
  accessories: Watch,
  "home & garden": Home,
  collectibles: Sparkles,
};

/** Saturated backgrounds that stay readable in both light and dark themes. */
const PALETTE = [
  "bg-rose-500 text-white",
  "bg-amber-400 text-amber-950",
  "bg-emerald-500 text-white",
  "bg-violet-500 text-white",
  "bg-orange-500 text-white",
  "bg-sky-500 text-white",
] as const;

export interface CategoryStyle {
  icon: LucideIcon;
  className: string;
}

export function getCategoryStyle(category: string, index: number): CategoryStyle {
  return {
    icon: ICONS[category.toLowerCase()] ?? Package,
    className: PALETTE[index % PALETTE.length],
  };
}
