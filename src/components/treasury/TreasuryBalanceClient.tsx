"use client";

import { useLocale } from "next-intl";
import { CountUp } from "@/components/ui/count-up";
import { Skeleton } from "@/components/ui/skeleton";
import { localizeFiat } from "@/lib/i18n/fiat";
import { FiatFallbackNote } from "./FiatFallbackNote";

export interface TreasuryBalanceClientProps {
  metric: "total" | "eth" | "auctions";
  value?: number;
  error?: string | null;
  /** USD→BRL rate for the fiat metric on pt-br; `null` keeps USD. */
  brlRate?: number | null;
}

export function TreasuryBalanceClient({
  metric,
  value,
  error,
  brlRate = null,
}: TreasuryBalanceClientProps) {
  const locale = useLocale();
  const isFiat = metric === "total";
  const decimals = isFiat ? 2 : 4;

  if (error) {
    return <div className="text-2xl font-semibold text-destructive">Error</div>;
  }

  if (value === undefined) {
    return <Skeleton className="h-8 w-32" />;
  }

  const { value: displayValue, currency } = isFiat
    ? localizeFiat(value, locale, brlRate)
    : { value, currency: null };
  const prefix =
    currency === "BRL" ? "R$ " : currency === "USD" ? (locale === "pt-br" ? "US$ " : "$") : "";
  const suffix = isFiat ? "" : " ETH";

  return (
    <div>
      <div className="text-2xl font-semibold text-foreground">
        {prefix}
        <CountUp value={displayValue} decimals={decimals} className="tabular-nums" />
        {suffix}
      </div>
      {isFiat && <FiatFallbackNote brlRate={brlRate} className="mt-1" />}
    </div>
  );
}
