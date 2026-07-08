import type { Product } from "@/types/store";
import { ProductVisual } from "./ProductVisual";

/**
 * Hero banner at the top of /store. Presentational — the breadcrumb/title/subtitle
 * are passed in (translated) and the hero product's visual floats on the right
 * (the animated 3D device for a `device3d` product, otherwise its cover image).
 */
export function StoreBanner({
  breadcrumb,
  title,
  subtitle,
  product,
}: {
  breadcrumb: string;
  title: string;
  subtitle: string;
  product: Product;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-primary/5 to-background px-6 py-10 md:px-12 md:py-14">
      {/* decorative glow */}
      <div className="pointer-events-none absolute -right-16 top-1/2 hidden h-80 w-80 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl md:block" />

      <div className="relative flex flex-col items-center gap-6 md:flex-row md:justify-between">
        <div className="max-w-md text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {breadcrumb}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">{title}</h1>
          <p className="mt-3 text-muted-foreground">{subtitle}</p>
        </div>

        <div className="relative aspect-[4/3] w-60 shrink-0 md:w-80">
          <ProductVisual
            product={product}
            priority
            sizes="(max-width: 768px) 240px, 320px"
            imageClassName="object-contain drop-shadow-xl"
          />
        </div>
      </div>
    </section>
  );
}
