import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { DAO_ADDRESSES } from "@/lib/config";
import { loadTreasurySnapshot } from "@/services/treasury";
import { loadTokenHoldings } from "./TokenHoldings";

/**
 * What the treasury is actually made of, as one bar.
 *
 * Every number here is already on this page somewhere — the ETH figure from the
 * snapshot, the ERC-20 values from the same `loadTokenHoldings` the table below
 * uses. This card adds no new source, it only answers the question the four KPIs
 * and the token table together cannot: what SHARE of the treasury is what.
 *
 * `loadTokenHoldings` is wrapped in React `cache()`, so calling it here and in
 * TokenHoldings costs one fetch per request, not two.
 *
 * Per-asset colours, not semantic tokens: these identify currencies, and the
 * bar's whole job is telling them apart. They match the mock's palette.
 */
const ASSET_COLOR: Record<string, string> = {
  ETH: "var(--color-amber-400)",
  USDC: "var(--color-sky-500)",
  WETH: "var(--color-indigo-500)",
};
/** Anything not named above. Cycled so two unknown tokens never share a colour. */
const FALLBACK_COLORS = [
  "var(--color-orange-400)",
  "var(--color-fuchsia-500)",
  "var(--color-teal-400)",
  "var(--color-rose-400)",
];

type Slice = { label: string; usd: number; color: string };

export async function TreasuryAllocation() {
  const t = await getTranslations("treasury.allocation");

  let slices: Slice[] = [];
  try {
    const [snapshot, tokens] = await Promise.all([
      loadTreasurySnapshot(DAO_ADDRESSES.treasury),
      loadTokenHoldings(DAO_ADDRESSES.treasury),
    ]);

    // The ETH row needs a USD figure, and the snapshot only carries the balance.
    // `usdTotal` minus the priced tokens is what is left, which IS the ETH value
    // — but only when every token priced. A `null` anywhere makes that
    // subtraction a guess, so the ETH slice is dropped rather than estimated.
    const priced = tokens.filter((tk) => tk.usdValue != null);
    const tokenUsd = priced.reduce((s, tk) => s + (tk.usdValue ?? 0), 0);
    const allPriced = priced.length === tokens.length && snapshot.usdTotal != null;
    const ethUsd = allPriced ? Math.max(0, (snapshot.usdTotal as number) - tokenUsd) : null;

    let fallbackIndex = 0;
    slices = [
      ...(ethUsd != null && ethUsd > 0
        ? [{ label: "ETH", usd: ethUsd, color: ASSET_COLOR.ETH }]
        : []),
      ...priced.map((tk) => ({
        label: tk.symbol,
        usd: tk.usdValue as number,
        color: ASSET_COLOR[tk.symbol] ?? FALLBACK_COLORS[fallbackIndex++ % FALLBACK_COLORS.length],
      })),
    ]
      .filter((s) => s.usd > 0)
      .sort((a, b) => b.usd - a.usd);
  } catch {
    slices = [];
  }

  // No priced assets means no honest bar to draw. Rendering an empty rail would
  // read as "the treasury is empty", which is a different claim entirely.
  if (slices.length === 0) return null;

  const total = slices.reduce((s, x) => s + x.usd, 0);
  const usd = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (n: number) => (n / total) * 100;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("subtitle", { count: slices.length })}</p>
        </div>

        <div className="mt-3.5 flex h-2.5 gap-0.5 overflow-hidden rounded-md">
          {slices.map((s) => (
            <div
              key={s.label}
              // `minWidth` so a 0.2% holding is still a visible sliver rather
              // than a sub-pixel gap that reads as a rendering bug.
              style={{ flexGrow: pct(s.usd), backgroundColor: s.color, minWidth: 3 }}
            />
          ))}
        </div>

        <ul className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2">
          {slices.map((s) => (
            <li key={s.label} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 rounded-[2px]"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-xs font-medium">{s.label}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {usd(s.usd)}
              </span>
              <span className="text-[11px] text-muted-foreground/70">{pct(s.usd).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
