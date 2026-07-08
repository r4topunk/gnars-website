import Image from "next/image";
import type { Product } from "@/types/store";
import KeepKeyDevice3D from "./KeepKeyDevice3D";

/**
 * Renders a product's visual: the animated 3D device when `product.device3d` is set,
 * otherwise the static cover image. Fills its parent — the caller controls the box
 * size (and must be `position: relative` for the image path).
 */
export function ProductVisual({
  product,
  variantTitle,
  duration = 14,
  priority = false,
  sizes,
  className,
  imageClassName,
}: {
  product: Product;
  /** Active finish for a device product; defaults to the first variant. */
  variantTitle?: string;
  duration?: number;
  priority?: boolean;
  sizes?: string;
  /** Applied to the device wrapper (device branch only). */
  className?: string;
  /** Applied to the `<Image>` (static-image branch only). */
  imageClassName?: string;
}) {
  if (product.device3d === "keepkey") {
    const variant = variantTitle ?? product.variants?.[0]?.title ?? "Classic";
    return (
      <div className={`flex h-full w-full items-center justify-center ${className ?? ""}`}>
        <KeepKeyDevice3D variant={variant} duration={duration} />
      </div>
    );
  }

  const cover = product.images[0];
  if (!cover) return null;
  return (
    <Image
      src={cover}
      alt={product.title}
      fill
      priority={priority}
      sizes={sizes}
      className={imageClassName}
    />
  );
}
