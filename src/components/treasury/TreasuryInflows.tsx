import { getTranslations } from "next-intl/server";
import { ArrowDownLeft, ExternalLink, Gavel } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadTreasuryInflows, type InflowAsset } from "@/services/treasury-inflows";

/** Per-asset accent. Deliberately not the semantic tokens — these identify a currency. */
const ASSET_TONE: Record<InflowAsset, string> = {
  ETH: "text-[#627eea]",
  WETH: "text-[#627eea]",
  USDC: "text-[#2775ca]",
};

/**
 * ETH is worth ~4 decimals; USDC is a dollar figure and reads wrong with more
 * than two. `maximumFractionDigits` alone would print `0` for auction dust, so
 * very small ETH amounts keep enough significant digits to stay non-zero.
 */
function formatAmount(amount: number, asset: InflowAsset, locale: string): string {
  if (asset === "USDC") {
    return amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (amount > 0 && amount < 0.0001) {
    return amount.toLocaleString(locale, { maximumSignificantDigits: 2 });
  }
  return amount.toLocaleString(locale, { maximumFractionDigits: 4 });
}

function ageLabel(at: string, now: number): string {
  const ms = now - new Date(at).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

/**
 * The treasury's most recent income, newest first.
 *
 * Auction settlements arrive as internal transfers and are marked as such — it
 * is the difference between "someone sent us money" and "the DAO earned it".
 */
export async function TreasuryInflows({ locale }: { locale: string }) {
  const t = await getTranslations("treasury.inflows");
  const inflows = await loadTreasuryInflows(8);
  // Rendered once per request on the server; the timestamp IS the snapshot.
  // eslint-disable-next-line react-hooks/purity -- server component, render-time clock read for relative ages
  const now = Date.now();

  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ArrowDownLeft className="size-4 text-emerald-500" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {inflows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {inflows.map((flow) => (
              <li key={flow.hash} className="flex items-center gap-3 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <AddressDisplay
                    address={flow.from}
                    variant="compact"
                    showCopy={false}
                    showExplorer={false}
                    truncateLength={4}
                  />
                  {flow.internal ? (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      title={t("auctionHint")}
                    >
                      <Gavel className="size-3" />
                      {t("auction")}
                    </span>
                  ) : null}
                </div>

                <span className="shrink-0 whitespace-nowrap font-mono text-sm font-semibold tabular-nums">
                  +{formatAmount(flow.amount, flow.asset, locale)}{" "}
                  <span className={ASSET_TONE[flow.asset]}>{flow.asset}</span>
                </span>

                <span className="w-9 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                  {ageLabel(flow.at, now)}
                </span>

                <a
                  href={`https://basescan.org/tx/${flow.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("viewTx")}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
