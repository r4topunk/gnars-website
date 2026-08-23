import { getLocale, getTranslations } from "next-intl/server";
import { Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFiatUsd } from "@/lib/i18n/fiat";
import { toIntlLocale } from "@/lib/i18n/format";
import { getBrlRateForRequest } from "@/services/exchange-rate";
import { loadTreasuryDefi, type DefiLiquidity } from "@/services/treasury-defi";

/**
 * "In DeFi" — what the treasury owns by right in protocol positions, stock not
 * flow. Every row is its own on-chain read; a failed read renders as a failure
 * (amber), a legitimate zero renders as $0 — the two must never look alike.
 * The vault-fee row is the stake graph's own `gnarsAccrued`, so this card and
 * the Sponsorship card can never disagree about that number.
 */
export async function TreasuryDefi() {
  const t = await getTranslations("treasury.defi");
  const locale = await getLocale();
  const [defi, brlRate] = await Promise.all([loadTreasuryDefi(), getBrlRateForRequest()]);

  const fiat = (usd: number) => formatFiatUsd(usd, locale, brlRate);
  const lockLabel = (liq: DefiLiquidity): string => {
    if (liq.kind === "proposal") return t("liquidity.proposal");
    if (liq.kind === "locked")
      return t("liquidity.locked", {
        date: new Date(liq.unlockAt * 1000).toLocaleDateString(toIntlLocale(locale), {
          day: "2-digit",
          month: "2-digit",
        }),
      });
    return t("liquidity.instant");
  };

  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Layers className="size-4" /> {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <ul className="divide-y">
          {defi.positions.map((p) => (
            <li key={p.labelKey} className="flex items-baseline justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="text-[13px] font-medium">{t(`positions.${p.labelKey}`)}</div>
                {/* Zero-by-design gets its explanation, not a redeem hint: the
                    treasury never deposits into the vaults — supporters do —
                    so a mute $0 here reads as a bug and invites the exact
                    wrong "fix" (rendering totalAssets, i.e. everyone's money,
                    as Gnars net worth). */}
                <div className="text-[11px] text-muted-foreground">
                  {p.labelKey === "vaultShares" && p.ok && p.usd === 0
                    ? t("positions.vaultSharesZeroNote")
                    : lockLabel(p.liquidity)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {p.ok ? (
                  <>
                    <span
                      className={`font-mono text-sm tabular-nums ${p.usd === 0 ? "text-muted-foreground" : "font-semibold"}`}
                    >
                      {fiat(p.usd)}
                    </span>
                    {p.amount && (
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {p.amount}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-500">
                    {t("readFailed")}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-baseline justify-between gap-2.5 border-t pt-3">
          <span className="text-xs text-muted-foreground">{t("total")}</span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {fiat(defi.knownUsd)}
            {!defi.complete && <span className="text-amber-600 dark:text-amber-500"> *</span>}
          </span>
        </div>
        {!defi.complete && (
          <p className="text-[11px] text-amber-600 dark:text-amber-500">{t("incomplete")}</p>
        )}
      </CardContent>
    </Card>
  );
}
