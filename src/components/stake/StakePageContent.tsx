"use client";

// The body of /stake and /stake/[rider]. Both routes render this and nothing else,
// so the two entry points can never drift apart — the only difference between them
// is which rider the page opens on.
//
// Section order:
//   rider → rates → your positions → who is backing → subnet → reward floater
//
// Visual language: docs/design/stake-visual-system.md, tokens in stake-ui.ts.
// Every section is its OWN card on the page background (no wrapping island),
// unnumbered headers, section weights that differ on purpose (rates is a slim
// strip-card, the orbit is the page's large visual), gold as the only UI accent,
// no decorative dots.
//
// What is deliberately NOT imported here: StakePositions (superseded by
// PositionsHub), MorpheusStakeWidget (superseded by SubnetSection), StakeAdminPanel
// (an owner tool that does not belong on a public page, and which shows a
// diagnostic card to any connected non-admin — it now lives at /stake/admin, so
// deploying a rider's vault still has a UI path). All three files stay on disk.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle } from "lucide-react";
import { BackerList } from "@/components/stake/BackerList";
import { CharacterSelector } from "@/components/stake/CharacterSelector";
import { MorLootbox } from "@/components/stake/MorLootbox";
import { PositionsHub } from "@/components/stake/PositionsHub";
import { RevealItem, RevealSection } from "@/components/stake/Reveal";
import { SectionHeader } from "@/components/stake/SectionHeader";
import {
  CARD,
  CARD_PAD,
  GOLD_TEXT,
  MICRO,
  ORBIT_STAGE,
  SECTION_TITLE,
} from "@/components/stake/stake-ui";
import { StakeOrbit } from "@/components/stake/StakeOrbit";
import { SubnetSection } from "@/components/stake/SubnetSection";
import { TokenMark, type TokenSymbol } from "@/components/stake/TokenMark";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useStakeGraph } from "@/hooks/use-stake-graph";
import type { RiderId } from "@/lib/gnars-vaults";
import { cn } from "@/lib/utils";
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
 * YieldStatus component: its internal styling is the older language (pulsing dot,
 * uppercase eyebrow, three stacked rows in a card), and a card gives global rates
 * the same weight as the sections that describe the user's own money. This is also
 * why the selector below is mounted with `showRates: false` — YieldStatus lives
 * inside its skills panel, and leaving it on would print these same three rows
 * twice.
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
  const t = useTranslations("stake.page");
  const { data, isLoading } = useQuery({
    queryKey: ["stake-yields"],
    queryFn: fetchYields,
    staleTime: 300_000,
  });

  // `id` keys the row's own help text. The three rates differ in more than the
  // number: Morpho pays in the asset you deposited and locks nothing, Morpheus
  // pays in MOR and holds the principal for 7 days. One shared explanation would
  // have to be true of all three, which leaves it saying almost nothing.
  const items: {
    id: "morphoUsdc" | "morpheusSteth" | "morpheusUsdc";
    asset: TokenSymbol;
    rate: StakeYields["usdc"] | undefined;
  }[] = [
    { id: "morphoUsdc", asset: "USDC", rate: data?.usdc },
    { id: "morpheusSteth", asset: "stETH", rate: data?.mor?.steth },
    { id: "morpheusUsdc", asset: "USDC", rate: data?.mor?.usdc },
  ];

  return (
    // One revealed block, not two: the strip has no header/body split to stagger —
    // it is the header. Its card keeps slimmer padding than the sections on
    // purpose: global rates should not weigh the same as the user's own money.
    <RevealSection className={cn(CARD, "px-4 py-3 sm:px-6 sm:py-4")}>
      {/* Title anchored left, rates pushed to the right edge: the strip reads as
          one label and its values, not as a sentence that trails off mid-card. */}
      <RevealItem className="sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-5 sm:gap-y-1">
        <h2 className={cn(SECTION_TITLE, "py-2 sm:py-0")}>{t("ratesTitle")}</h2>

        {/* Skeleton is one muted line, not three grey blocks: in a strip this
            short a shimmer would be more chrome than the content it stands in for. */}
        {isLoading ? (
          <p className={cn("py-2 font-mono text-sm sm:py-0", MICRO)}>{t("ratesLoading")}</p>
        ) : (
          <ul className="divide-y divide-foreground/[0.07] sm:flex sm:flex-wrap sm:items-center sm:divide-x sm:divide-y-0 sm:divide-foreground/[0.08]">
            {items.map((it, i) => (
              <li
                key={`${it.asset}-${it.rate?.source ?? i}`}
                className="flex items-center justify-between gap-3 py-2 sm:gap-2.5 sm:px-3 sm:py-0 sm:first:pl-0 sm:last:pr-0"
              >
                <span className="flex items-center gap-2">
                  {/* Venue mark, asset badged onto its corner: where you stake and
                      in what, in one object. */}
                  <TokenMark token={it.asset} venue={it.rate?.source} />
                  <span className="text-sm font-semibold">{it.asset}</span>
                  {/* Two of the three rows are USDC; without the venue the strip
                      reads as a contradiction. The corner badge says the same
                      thing in a mark, but only to a reader who knows both. */}
                  {it.rate?.source ? (
                    <span className={cn("text-xs", MICRO)}>{it.rate.source}</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-sm tabular-nums">
                    {it.rate == null ? (
                      <span className={MICRO}>{t("ratesNa")}</span>
                    ) : (
                      // MOR emissions swing, so those rates are prefixed "≈".
                      // Printing them like the measured Morpho APY would be fake
                      // precision.
                      `${it.rate.estimate ? "≈ " : ""}${it.rate.apy.toFixed(1)}%`
                    )}
                  </span>
                  {/* Uncontrolled Tooltip: Radix opens it on hover AND on focus,
                      and a tap focuses the button, so touch needs no second
                      control. */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={t("rateHelpLabel", {
                          asset: it.asset,
                          venue: it.rate?.source ?? "",
                        })}
                        className={cn(
                          "cursor-pointer rounded-full transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2",
                          MICRO,
                        )}
                      >
                        <HelpCircle className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-64 text-pretty leading-relaxed">
                      {t(`rateHelp.${it.id}`)}
                    </TooltipContent>
                  </Tooltip>
                </span>
              </li>
            ))}
          </ul>
        )}
      </RevealItem>
    </RevealSection>
  );
}

/**
 * The three numbers the social-proof section is actually about, printed once,
 * above the visual. They used to live inside StakeOrbit's drawing, where they
 * competed with the graph and could not be read on a phone at all — and where the
 * mobile list arm simply did not have them.
 *
 * Same `useStakeGraph` hook (and therefore the same react-query cache entry) as
 * both arms below, so the stat line can never disagree with what it sits above.
 */
function SocialStats() {
  const t = useTranslations("stake.page.stats");
  const locale = useLocale();
  const graph = useStakeGraph();

  if (!graph) return null;

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
      <p className="flex items-baseline gap-1.5">
        <span className={cn("font-mono text-lg font-bold tabular-nums", GOLD_TEXT)}>
          {usd(graph.total, locale)}
        </span>
        <span className={cn("text-xs", MICRO)}>{t("staked")}</span>
      </p>
      <p className="flex items-baseline gap-1.5">
        <span className="font-mono text-sm tabular-nums">{graph.backerCount}</span>
        <span className={cn("text-xs", MICRO)}>{t("backers", { n: graph.backerCount })}</span>
      </p>
      <p className="flex items-baseline gap-1.5">
        <span className={cn("font-mono text-sm tabular-nums", GOLD_TEXT)}>
          {usd(graph.treasuryUsd, locale)}
        </span>
        <span className={cn("text-xs", MICRO)}>{t("treasury")}</span>
      </p>
    </div>
  );
}

export function StakePageContent({ initialRider }: { initialRider?: RiderId }) {
  const t = useTranslations("stake");
  const tp = useTranslations("stake.page");
  // Focus is owned here so the picker and the sponsorship graph agree on who is
  // being looked at. Before this they disagreed: the selector tracked its own
  // index while StakeOrbit kept a separate focusId that nothing ever updated.
  const [focus, setFocus] = useState<RiderId | null>(initialRider ?? null);

  return (
    <div className="space-y-8">
      {/* Title and hero paragraph sit OUTSIDE the card, so the page opens exactly
          like Treasury and Auctions do. */}
      <header className="space-y-3 text-center">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{t("title")}</h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {tp("hero")}
        </p>
      </header>

      {/* One card per section, stacked on the page background. Tighter rhythm than
          the sections had inside the old island (6, not 10): the card borders now
          do the separating that the empty space used to. PositionsHub and
          SubnetSection render their own cards for the same reason they own their
          headers — PositionsHub can self-suppress, and a frame rendered here would
          strand around nothing. */}
      <div className="space-y-6">
        {/* `#stake-start` is where every "start here" link on the site lands;
            `scroll-mt-24` keeps the sticky header off the section it reveals. */}
        <div id="stake-start" className="scroll-mt-24">
          <RevealSection className={cn(CARD, CARD_PAD, "space-y-4")}>
            <RevealItem>
              <SectionHeader title={t("subtitle")} />
            </RevealItem>
            <RevealItem delay={50}>
              {/* onSelect drives the orbit's focus — picking a rider up here
                  re-centres the graph further down instead of leaving the two out
                  of sync. `showRates: false` because RatesStrip below states the
                  same three APYs at page level. */}
              <CharacterSelector
                initialRider={initialRider}
                onSelect={setFocus}
                preview={{ showRates: false }}
              />
            </RevealItem>
          </RevealSection>
        </div>

        <RatesStrip />

        <PositionsHub />

        <RevealSection className={cn(CARD, CARD_PAD, "space-y-4")}>
          <RevealItem>
            <SectionHeader title={tp("socialTitle")} desc={tp("socialDesc")} />
          </RevealItem>
          {/* Stats and the visual are ONE revealed block: the stat line is a
              caption for the graph under it, and revealing them separately would
              stagger a sentence away from its subject. */}
          <RevealItem delay={50} className="space-y-4">
            <SocialStats />

            {/* The graph renders at every width. StakeOrbit already ships the
                small-screen arm — below `md` it draws at a 680px minimum inside
                its own horizontal scroller, so a phone pans across the graph
                instead of squinting at a shrunken one.

                ORBIT_STAGE inside the card: the orbit is artwork drawn for a dark
                stage (white labels, dark halos), so it keeps its own dark surface
                even on a light page — framed by the section card the way a photo
                sits in an article. `chromeless` drops the orbit's own card, title
                and stats row, so the stage is the only frame and SectionHeader is
                the only title. */}
            <div className={cn(ORBIT_STAGE, "p-2 sm:p-4")}>
              {/* Focus is ONE piece of state shared both ways: the selector
                  writes it, the graph reads it, and `onFocusChange` reports the
                  graph's own clicks (a node, "all riders") back up. Seeding
                  without reporting is what let them drift and then stick —
                  re-picking the rider the parent already held set an equal
                  value, React bailed out, and the graph never re-synced. */}
              <StakeOrbit focusRider={focus} onFocusChange={setFocus} chromeless />
            </div>
            {/* The ranked list stays below `md`, under the graph rather than
                instead of it. Not a duplicate: the orbit reveals a backer's ENS on
                hover, and hover is gated to a mouse, so on touch the backer dots
                are anonymous and this list is the only place a phone can read who
                is behind a rider — or tap through to their profile. */}
            <div className="md:hidden">
              <BackerList />
            </div>
          </RevealItem>
        </RevealSection>

        <SubnetSection />
      </div>

      {/* One floater, and only when the wallet actually has something to
          collect. */}
      <MorLootbox />
    </div>
  );
}
