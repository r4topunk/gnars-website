"use client";

import { useLocale } from "next-intl";
import { CountUp } from "@/components/ui/count-up";
import { localizeFiat } from "@/lib/i18n/fiat";

interface KpiValueProps {
  /** `null` = value unavailable — renders an em dash, never 0. */
  value: number | null;
  decimals: number;
  /** Token unit ("ETH", "USDC") rendered after the number. Omit for fiat. */
  unit?: string;
  /** Convert to BRL on pt-br (Total Treasury Value only). */
  fiat?: boolean;
  brlRate?: number | null;
  className?: string;
}

export function KpiValue({
  value,
  decimals,
  unit,
  fiat,
  brlRate = null,
  className,
}: KpiValueProps) {
  const locale = useLocale();
  if (value == null) {
    return <span className="font-mono text-2xl font-bold text-muted-foreground">—</span>;
  }
  const { value: displayValue, currency } = fiat
    ? localizeFiat(value, locale, brlRate)
    : { value, currency: null };
  const prefix =
    currency === "BRL" ? "R$ " : currency === "USD" ? (locale === "pt-br" ? "US$ " : "$") : "";
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span
        className={`font-mono text-2xl font-bold tabular-nums tracking-tight ${className ?? ""}`}
      >
        {prefix}
        <CountUp value={displayValue} decimals={decimals} className="tabular-nums" />
      </span>
      {unit && <span className="text-xs font-medium text-muted-foreground">{unit}</span>}
    </span>
  );
}
