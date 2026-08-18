import { toIntlLocale } from "@/lib/i18n/format";

export type FiatCurrency = "USD" | "BRL";

/**
 * All fiat figures in the app are computed in USD. On the pt-br locale they are
 * DISPLAYED in BRL — converted at one USD→BRL rate — with USD as the fallback
 * whenever the rate could not be fetched (`brlRate` null). Conversion applies
 * uniformly to every USD figure: a USDC position's usdValue is a USD amount
 * like any other, so 1 USDC renders as ~R$ 5-something, never as R$ 1.
 */
export function localizeFiat(
  usdValue: number,
  locale: string,
  brlRate: number | null,
): { value: number; currency: FiatCurrency } {
  if (locale === "pt-br" && brlRate != null) {
    return { value: usdValue * brlRate, currency: "BRL" };
  }
  return { value: usdValue, currency: "USD" };
}

/** Convenience: localizeFiat + Intl currency formatting in the locale's conventions. */
export function formatFiatUsd(
  usdValue: number,
  locale: string,
  brlRate: number | null,
  options?: Pick<Intl.NumberFormatOptions, "minimumFractionDigits" | "maximumFractionDigits">,
): string {
  const { value, currency } = localizeFiat(usdValue, locale, brlRate);
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(value);
}
