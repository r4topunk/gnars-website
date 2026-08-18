"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFiatUsd } from "@/lib/i18n/fiat";
import { toIntlLocale } from "@/lib/i18n/format";
import { FiatFallbackNote } from "./FiatFallbackNote";

export interface EnrichedToken {
  contractAddress: string;
  balance: number;
  decimals: number;
  symbol: string;
  name: string;
  logo?: string;
  /** `null` when the token could not be priced — render as unavailable, not $0. */
  usdValue: number | null;
}

interface TokenHoldingsClientProps {
  tokens: EnrichedToken[];
  error?: string | null;
  /** USD→BRL rate for value display on pt-br; `null` keeps USD. */
  brlRate?: number | null;
}

export function TokenHoldingsClient({ tokens, error, brlRate = null }: TokenHoldingsClientProps) {
  const t = useTranslations("treasury");
  const locale = useLocale();
  const intlLocale = toIntlLocale(locale);

  const formatBalance = (balance: number, decimals: number) => {
    return new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits: decimals > 6 ? 2 : Math.min(decimals, 4),
      maximumFractionDigits: decimals > 6 ? 2 : Math.min(decimals, 4),
    }).format(balance);
  };

  const formatUsdValue = (value: number | null) => {
    // A real balance we couldn't price reads as a dash, never as $0.00.
    if (value == null) return "—";
    return formatFiatUsd(value, locale, brlRate);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">{t("tokens.errorLoading", { error })}</div>
        </CardContent>
      </Card>
    );
  }

  if (!tokens.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <div className="text-lg font-medium mb-2">{t("tokens.empty")}</div>
            <div className="text-sm">{t("tokens.emptyDescription")}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tokens.title")}</CardTitle>
        <CardDescription>{t("tokens.description")}</CardDescription>
        <FiatFallbackNote brlRate={brlRate} />
      </CardHeader>
      <CardContent>
        {/* Two-line rows instead of a three-column table: this card lives in
            the narrow right column, where the table's Value column clipped
            against the card edge. */}
        <ul className="divide-y">
          {tokens.map((token) => (
            <li
              key={token.contractAddress}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                {token.logo && (
                  <Image
                    src={token.logo}
                    alt={token.symbol}
                    width={24}
                    height={24}
                    className="rounded-full"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium">{token.name}</div>
                  <div className="text-sm text-muted-foreground">{token.symbol}</div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-medium tabular-nums">{formatUsdValue(token.usdValue)}</div>
                <div className="text-sm text-muted-foreground tabular-nums">
                  {formatBalance(token.balance, token.decimals)} {token.symbol}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
