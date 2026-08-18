"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Shown on pt-br whenever the USD→BRL rate could not be fetched: the page then
 * keeps its figures in US$, and this note says so out loud. Silent fallback is
 * the failure mode this exists to prevent — a visitor must never read a USD
 * number as reais.
 */
export function FiatFallbackNote({
  brlRate,
  className,
}: {
  brlRate: number | null;
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("treasury.fiat");
  if (locale !== "pt-br" || brlRate != null) return null;
  return (
    <p className={cn("text-xs text-amber-600 dark:text-amber-500", className)}>
      {t("usdFallback")}
    </p>
  );
}
