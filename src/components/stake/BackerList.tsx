"use client";

// The ranked-list rendering of the sponsorship graph.
//
// One job: it is the social proof below `md`, where the pannable orbit graph is
// unusable (a smear of overlapping labels inside a scroll container that fights
// the page scroll). The objection to it still stands — a flat list hides backers
// who support more than one rider, which is exactly why StakeOrbit exists — so
// this is the small-screen arm, and desktop keeps the graph.
//
// Renders bare (no header, no frame, no totals): it sits directly on the social
// section's card, which prints the stat line above it, so both arms share one
// frame and the totals are stated once.
import { useLocale, useTranslations } from "next-intl";
import { MICRO, MUTED, ROW_LIST, ROW_PAD } from "@/components/stake/stake-ui";
import { useStakeGraph } from "@/hooks/use-stake-graph";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { StakeGraph } from "@/services/stake-graph";

const usd = (n: number, locale: string) =>
  `$${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/**
 * `data` swaps in a caller-supplied graph for the fetched one. Nothing on /stake
 * passes it today (the page is live-only), but it is the seam StakeOrbit already
 * exposes, kept here so both arms of the social proof can be driven from one
 * source if a caller ever needs to. `useStakeGraph` is called unconditionally
 * either way — it is a react-query subscription, not a side-effect that can be
 * skipped.
 */
export function BackerList({ data }: { data?: StakeGraph } = {}) {
  const t = useTranslations("stake.page.backers");
  // Rider names come from the roster's own copy, like the orbit's labels do.
  // This used to print the raw id under a `capitalize` class, which forced a
  // capital on every rider — including the one whose name is lowercase.
  const tc = useTranslations("stake.characters");
  const locale = useLocale();
  const live = useStakeGraph();
  const graph = data ?? live;

  if (!graph) return <p className={cn("text-sm", MICRO)}>{t("loading")}</p>;

  const ranked = [...graph.athletes].filter((a) => a.total > 0).sort((a, b) => b.total - a.total);

  if (ranked.length === 0) return <p className={cn("text-sm", MUTED)}>{t("empty")}</p>;

  return (
    // No sub-cards: one hairline between riders. No padding of its own — the
    // section card's padding is what keeps the rows off the frame.
    <ul className={ROW_LIST}>
      {ranked.map((a) => (
        <li key={a.id} className={ROW_PAD}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-semibold">{tc(`${a.id}.name`)}</span>
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
                    rows would all read as near-identical 0x-shorts.

                    Every identity on the site links to the internal profile, never
                    to an explorer — and below `md` this list IS the social proof,
                    so an unlinked backer is a dead end on the primary surface. */}
                <Link
                  href={`/members/${b.address}`}
                  className="truncate font-mono hover:text-foreground hover:underline"
                >
                  {b.ens ?? short(b.address)}
                </Link>
                <span className="shrink-0 font-mono tabular-nums">{usd(b.amount, locale)}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
