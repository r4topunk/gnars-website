import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/store";
import { ProductVisual } from "./ProductVisual";
import { formatPrice } from "./shared";

export interface HeroStat {
  value: string;
  label: string;
  /** Render the value in the rust accent (used for the CC0 / open-brand stat). */
  accent?: boolean;
}

/**
 * Editorial "Premium Spotlight" hero: eyebrow rule + label, oversized headline,
 * muted subtitle, cream + ghost CTAs, a stat row, and a bordered featured-product
 * panel on the right whose visual links through to the product detail page.
 */
export function StoreHero({
  eyebrow,
  headline,
  subtitle,
  browseLabel,
  featuredDropLabel,
  featuredLabel,
  stats,
  product,
}: {
  eyebrow: string;
  headline: string;
  subtitle: string;
  browseLabel: string;
  featuredDropLabel: string;
  featuredLabel: string;
  stats: HeroStat[];
  product?: Product;
}) {
  return (
    <section className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
      {/* Left: editorial copy */}
      <div>
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-[#e08968]" />
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-[#e08968]">
            {eyebrow}
          </span>
        </div>

        <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
          {headline}
        </h1>

        <p className="mt-6 max-w-md leading-relaxed text-muted-foreground md:text-lg">{subtitle}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#all-products"
            className="cursor-pointer rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {browseLabel}
          </a>
          {product && (
            <Link
              href={`/store/${product.slug}`}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:border-foreground/40"
            >
              {featuredDropLabel}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="mt-10 h-px w-full bg-border" />

        <dl className="mt-6 flex gap-10">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dd
                className={cn(
                  "text-2xl font-bold",
                  stat.accent ? "text-[#e08968]" : "text-foreground",
                )}
              >
                {stat.value}
              </dd>
              <dt className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>

      {/* Right: featured product panel */}
      {product && (
        <Link
          href={`/store/${product.slug}`}
          className="group relative flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-popover md:min-h-[460px]"
        >
          <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_45%,rgba(224,137,104,0.10),transparent_60%)]" />
          <div className="relative flex flex-1 items-center justify-center p-8">
            <ProductVisual product={product} priority sizes="(max-width: 1024px) 90vw, 500px" />
          </div>
          <div className="relative border-t border-border bg-background/50 px-6 py-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#e08968]">
              {featuredLabel}
            </div>
            <div className="mt-1 font-semibold text-foreground">
              {product.title} — {formatPrice(product.price, product.currency)}
            </div>
          </div>
        </Link>
      )}
    </section>
  );
}
