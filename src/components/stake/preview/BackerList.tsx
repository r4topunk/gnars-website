"use client";

// The ranked-list rendering of the sponsorship graph.
//
// Two jobs since v3: it is the ONLY social proof below `md` (the pannable orbit is
// unusable at phone width), and above `md` it is the alternate arm of the ?orbit
// toggle. The cold read's objection still stands — a flat list hides backers who
// support more than one rider, which is exactly why StakeOrbit exists — so the
// list is the small-screen fallback, not the verdict on desktop.
//
// Renders bare (no header, no panel, no totals): the parent wraps both arms in the
// panel recipe and prints the stat line above them, so the two arms swap inside
// identical chrome and the totals are stated once.
import { useLocale, useTranslations } from "next-intl";
import { MICRO, MUTED, ROW_LIST, ROW_PAD } from "@/components/stake/preview/preview-config";
import { useStakeGraph } from "@/hooks/use-stake-graph";
import { cn } from "@/lib/utils";
import type { StakeGraph } from "@/services/stake-graph";

const usd = (n: number, locale: string) =>
  `$${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/**
 * `data` swaps in a caller-supplied graph (the ?demo=1 fixture) for the fetched
 * one, so this list, the orbit and the stat line above them are all reading the
 * same rows. Omitted, it fetches exactly as before. `useStakeGraph` is called
 * unconditionally either way — it is a react-query subscription, not a
 * side-effect that can be skipped.
 */
export function BackerList({ data }: { data?: StakeGraph } = {}) {
  const t = useTranslations("stake.preview.backers");
  const locale = useLocale();
  const live = useStakeGraph();
  const graph = data ?? live;

  if (!graph) return <p className={cn("p-2 text-sm", MICRO)}>{t("loading")}</p>;

  const ranked = [...graph.athletes].filter((a) => a.total > 0).sort((a, b) => b.total - a.total);

  if (ranked.length === 0) return <p className={cn("p-2 text-sm", MUTED)}>{t("empty")}</p>;

  return (
    // No sub-cards: one hairline between riders, and the panel's padding is what
    // keeps the rows off the frame.
    <ul className={cn(ROW_LIST, "px-2 sm:px-3")}>
      {ranked.map((a) => (
        <li key={a.id} className={ROW_PAD}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-semibold capitalize">{a.id}</span>
            <span className="font-mono text-sm tabular-nums">{usd(a.total, locale)}</span>
          </div>
          <ul className="mt-1.5 space-y-0.5">
            {a.backers.map((b) => (
              <li
                // `asset` belongs in the key for the same reason it does in
                // StakeOrbit's: one wallet can stake MOR in BOTH Morpheus pools
                // (stETH and USDC), which are two rows with the same address and
                // kind. Without it React saw duplicate keys and dropped one —
                // this fires on the LIVE data today (vlad's wallet), silently
                // hiding a real stake from the list.
                key={`${b.address}-${b.kind}-${b.asset ?? "na"}`}
                className={cn("flex justify-between gap-3 text-xs", MICRO)}
              >
                {/* A name the graph already carries wins over the address. This
                    list does no ENS lookup of its own, so without it the fixture
                    rows would all read as near-identical 0x-shorts. */}
                <span className="truncate font-mono">{b.ens ?? short(b.address)}</span>
                <span className="shrink-0 font-mono tabular-nums">{usd(b.amount, locale)}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
