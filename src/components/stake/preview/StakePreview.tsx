"use client";

// The proposed /stake structure, composed from the real components so the
// prototype is judged on the real theme, real primitives and real data — a static
// mock would reproduce the exact problem the review is trying to fix.
//
// Section order vs production:
//   today:  header → selector → orbit → positions (bottom, and absent on /stake/[rider])
//   here:   header → rider → rates → positions → social proof → subnet
//
// The visual language is DESIGN-SPEC.md v3: one panel recipe, unnumbered headers,
// section weights that differ on purpose (rates is a ~56px strip, the orbit is the
// page's large visual), gold as the only UI accent, and no decorative dots.
//
// What is deliberately NOT here: any deletion. StakeFlowChart, AnimatedChest3D and
// StakeAdminPanel are simply not imported. Coupling "do you like this structure?"
// to "may I delete the 1501-line chest?" lets a no on the chest sink the layout.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { MorLootbox } from "@/components/stake/MorLootbox";
import { BackerList } from "@/components/stake/preview/BackerList";
import { DEMO_GRAPH } from "@/components/stake/preview/demo-graph";
import { PositionsHub } from "@/components/stake/preview/PositionsHub";
import {
  GOLD_SOLID,
  MICRO,
  PANEL,
  SECTION_TITLE,
  type PreviewConfig,
} from "@/components/stake/preview/preview-config";
import { RiderSelect } from "@/components/stake/preview/RiderSelect";
import { SectionHeader } from "@/components/stake/preview/SectionHeader";
import { SubnetSection } from "@/components/stake/preview/SubnetSection";
import { StakeOrbit } from "@/components/stake/StakeOrbit";
import { useStakeGraph } from "@/hooks/use-stake-graph";
import type { RiderId } from "@/lib/gnars-vaults";
import { cn } from "@/lib/utils";
import type { StakeGraph } from "@/services/stake-graph";
import type { StakeYields } from "@/services/yields";

async function fetchYields(): Promise<StakeYields> {
  const res = await fetch("/api/yields");
  if (!res.ok) throw new Error("failed to load yields");
  return res.json();
}

const usd = (n: number, locale: string) =>
  `$${n.toLocaleString(locale, { maximumFractionDigits: n > 0 && n < 100 ? 2 : 0 })}`;

/**
 * Rates as one slim strip instead of a panel. Two reasons it does not reuse the
 * YieldStatus component: its internal styling is the old language (pulsing dot,
 * uppercase eyebrow, three stacked rows in a card), and a card gives global rates
 * the same weight as the sections that describe the user's own money.
 *
 * Same `/api/yields` payload and the same 300s staleTime as YieldStatus, so the
 * two can never disagree and the CDN-cached response is not fetched twice.
 *
 * Layout: below `sm` the three rates are rows (venue left, rate right) because an
 * inline strip wrapped into an unreadable ribbon on a phone. From `sm` up they go
 * back inline, and the separators are CSS borders — a literal "·" between every
 * item is a dot chain, which the spec bans.
 */
function RatesStrip() {
  const t = useTranslations("stake.preview");
  const { data, isLoading } = useQuery({
    queryKey: ["stake-yields"],
    queryFn: fetchYields,
    staleTime: 300_000,
  });

  const items = [
    { asset: "USDC", rate: data?.usdc },
    { asset: "stETH", rate: data?.mor?.steth },
    { asset: "USDC", rate: data?.mor?.usdc },
  ];

  return (
    <section className="border-y border-white/[0.08] py-2 sm:min-h-14 sm:py-3">
      <div className="sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1">
        <h2 className={cn(SECTION_TITLE, "py-2 sm:py-0")}>{t("ratesTitle")}</h2>

        {/* Skeleton is one muted line, not three grey blocks: at 56px tall a shimmer
            would be more chrome than the content it stands in for. */}
        {isLoading ? (
          <p className={cn("py-2 font-mono text-sm sm:py-0", MICRO)}>{t("ratesLoading")}</p>
        ) : (
          <ul className="divide-y divide-white/[0.06] sm:flex sm:flex-wrap sm:items-baseline sm:divide-x sm:divide-y-0 sm:divide-white/[0.08]">
            {items.map((it, i) => (
              <li
                key={`${it.asset}-${it.rate?.source ?? i}`}
                className="flex items-baseline justify-between gap-3 py-2 sm:gap-2 sm:px-3 sm:py-0 sm:first:pl-0 sm:last:pr-0"
              >
                <span className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{it.asset}</span>
                  {/* Two of the three rows are USDC; without the venue the strip
                      reads as a contradiction. */}
                  {it.rate?.source ? (
                    <span className={cn("text-xs", MICRO)}>{it.rate.source}</span>
                  ) : null}
                </span>
                <span className="font-mono text-sm tabular-nums">
                  {it.rate == null ? (
                    <span className={MICRO}>{t("ratesNa")}</span>
                  ) : (
                    // MOR emissions swing, so those rates are prefixed "≈". Printing
                    // them like the measured Morpho APY would be fake precision.
                    `${it.rate.estimate ? "≈ " : ""}${it.rate.apy.toFixed(1)}%`
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * The three numbers the social-proof section is actually about, printed once,
 * above the visual. They used to live inside StakeOrbit's drawing, where they
 * competed with the graph and could not be read on a phone at all — and where the
 * list arm of the toggle simply did not have them.
 *
 * Same `useStakeGraph` hook (and therefore the same react-query cache entry) as
 * both arms below, so the stat line can never disagree with what it sits above.
 * `data` overrides it with the ?demo=1 fixture — passed to all three consumers
 * from one place for exactly that reason.
 */
function SocialStats({ data }: { data?: StakeGraph }) {
  const t = useTranslations("stake.preview.stats");
  const locale = useLocale();
  const live = useStakeGraph();
  const graph = data ?? live;

  if (!graph) return null;

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
      <p className="flex items-baseline gap-1.5">
        <span className="font-mono text-lg font-bold tabular-nums" style={{ color: GOLD_SOLID }}>
          {usd(graph.total, locale)}
        </span>
        <span className={cn("text-xs", MICRO)}>{t("staked")}</span>
      </p>
      <p className="flex items-baseline gap-1.5">
        <span className="font-mono text-sm tabular-nums">{graph.backerCount}</span>
        <span className={cn("text-xs", MICRO)}>{t("backers", { n: graph.backerCount })}</span>
      </p>
      <p className="flex items-baseline gap-1.5">
        <span className="font-mono text-sm tabular-nums" style={{ color: GOLD_SOLID }}>
          {usd(graph.treasuryUsd, locale)}
        </span>
        <span className={cn("text-xs", MICRO)}>{t("treasury")}</span>
      </p>
    </div>
  );
}

export function StakePreview({ config, rider }: { config: PreviewConfig; rider?: RiderId }) {
  const t = useTranslations("stake");
  const tp = useTranslations("stake.preview");
  // Focus is owned here so the picker and the flow graph agree on who is being
  // looked at. In production they disagree: the selector tracks its own index
  // while StakeOrbit keeps a separate focusId that nothing ever updates.
  const [focus, setFocus] = useState<RiderId | null>(rider ?? null);

  const centered = config.header === "center";

  // ?demo=1 already fills the positions hub with fixtures; the social proof below
  // used to ignore it and render the live graph's handful of backers, which shows
  // a reviewer nothing about how the section behaves once riders are actually
  // backed. One fixture feeds all three consumers so they cannot disagree.
  const demoGraph = config.demo ? DEMO_GRAPH : undefined;

  return (
    <div className="space-y-8">
      {/* Title and hero paragraph sit OUTSIDE the island, so the page opens exactly
          like Treasury and Auctions do. They use the site's own theme tokens (the
          dark scope starts below), which is why the paragraph is
          `text-muted-foreground` and not a white alpha. */}
      <header className={cn("space-y-3", centered && "text-center")}>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{t("title")}</h1>
        <p
          className={cn(
            "max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base",
            centered && "mx-auto",
          )}
        >
          {tp("hero")}
        </p>
      </header>

      {/* The island: an explicit stage that starts at the rider section. Two nested
          elements on purpose — `dark bg-background` guarantees a dark base whatever
          the site theme is doing (white/50 body text on a light card is
          unreadable), and the inner 2% white lifts it off that base the way the
          spec draws it. Rounded at every breakpoint, no negative margins. */}
      <div className="dark rounded-2xl bg-background text-foreground shadow-xl">
        <div className="space-y-10 rounded-2xl bg-white/[0.02] px-4 py-8 ring-1 ring-white/[0.06] sm:space-y-12 sm:px-6">
          <section className="space-y-4">
            <SectionHeader title={t("subtitle")} />
            {/* onSelect drives the orbit's focus — picking a rider up here re-centres
                the graph further down instead of leaving the two out of sync. */}
            <RiderSelect initialRider={rider} onSelect={setFocus} />
          </section>

          <RatesStrip />

          <PositionsHub config={config} />

          <section className="space-y-4">
            <SectionHeader title={tp("socialTitle")} desc={tp("socialDesc")} />
            <SocialStats data={demoGraph} />

            {/* The graph is desktop-only. It is a pannable 2D orbit: on a phone it is
                a smear of overlapping labels inside a scroll container that fights the
                page scroll, and the ranked list answers "who is backing whom" better
                at that size. The ?orbit toggle therefore only switches the desktop arm. */}
            <div className={cn(PANEL, "hidden p-2 sm:p-4 md:block")}>
              {config.orbit === "graph" ? (
                // `chromeless` drops the orbit's own card, title and stats row, so the
                // panel is the only frame and SectionHeader is the only title.
                <StakeOrbit focusRider={focus} chromeless data={demoGraph} />
              ) : (
                <BackerList data={demoGraph} />
              )}
            </div>
            <div className={cn(PANEL, "p-2 md:hidden")}>
              <BackerList data={demoGraph} />
            </div>
          </section>

          <SubnetSection />

          {/* One floater, and only when the wallet actually has something to collect.
              MorpheusStakeWidget is gone — its job is the subnet section above. */}
          <MorLootbox />
        </div>
      </div>
    </div>
  );
}
