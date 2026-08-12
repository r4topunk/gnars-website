"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BountyCardFan, type FanCard, type Rarity } from "@/components/bounties/BountyCardFan";
import { formatEthToUsd, useEthPrice } from "@/hooks/use-eth-price";
import { usePoidhBounties, type PoidhBountiesResponse } from "@/hooks/usePoidhBounties";
import { Link } from "@/i18n/navigation";
import { toIntlLocale } from "@/lib/i18n/format";
import { CHAIN_NAMES } from "@/lib/poidh/config";
import { DISCIPLINE_CODE, selectShowcaseBounties, showcasePool } from "./bounty-hand";
import { SectionHeading, SHELL, StatTile } from "./primitives";

/** How many cards the hand holds. Six is the widest fan that still reads at 1152px. */
const HAND_SIZE = 6;

/** Rarity by rank within the hand: the richest bounty is the Legendary. */
const RANK_RARITY: Rarity[] = ["legendary", "epic", "rare", "rare", "uncommon", "common"];

/** poidh's own route for a bounty — where a claim is actually submitted. */
const POIDH_CHAIN_SLUG: Record<number, string> = { 8453: "base", 42161: "arbitrum" };

/** The card back shows prose, so the markdown thumbnail is pulled back out. */
function stripMarkdownImages(text: string): string {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/Thumbnail:\s*/gi, "")
    .trim();
}

/**
 * Deal the hand centre-out so the Legendary sits in the middle: rank 1 takes the
 * centre slot, then 2, 3, 4… alternate right and left of it. Without this the
 * fan would run richest-to-poorest left-to-right and bury the headline bounty.
 */
function dealCenterOut<T>(ranked: T[]): T[] {
  const slots: T[] = new Array(ranked.length);
  const centre = Math.floor((ranked.length - 1) / 2);
  let right = centre;
  let left = centre;
  ranked.forEach((item, rank) => {
    if (rank === 0) {
      slots[centre] = item;
    } else if (rank % 2 === 1) {
      slots[++right] = item;
    } else {
      slots[--left] = item;
    }
  });
  return slots.filter(Boolean);
}

export function BountiesSection({
  /**
   * The server already fetched this for the ticker totals — handing it over as
   * react-query's initial data means the hand is dealt in the server HTML
   * instead of popping in after hydration.
   */
  initialBounties,
}: {
  initialBounties?: PoidhBountiesResponse;
}) {
  const t = useTranslations("newhome.bounties");
  const tb = useTranslations("bounties");
  const locale = useLocale();
  const { ethPrice } = useEthPrice();
  const { data, isLoading } = usePoidhBounties({
    status: "open",
    limit: 100,
    filterGnarly: true,
    initialData: initialBounties,
  });

  const bounties = useMemo(() => data?.bounties ?? [], [data]);

  const { hand, pool, showcaseCount, usdTotal } = useMemo(() => {
    const ranked = selectShowcaseBounties(bounties);
    const total = showcasePool(ranked);
    const top = ranked.slice(0, HAND_SIZE);

    const cards: FanCard[] = top.map(({ bounty: b, discipline, eth }, rank) => {
      // eslint-disable-next-line react-hooks/purity -- intentional render-time clock read for the "Xd" age label
      const daysAgo = Math.max(0, Math.floor((Date.now() - b.createdAt * 1000) / 86_400_000));
      const statusTone = b.isCanceled
        ? ("closed" as const)
        : b.isVoting
          ? ("voting" as const)
          : b.isCompleted
            ? ("closed" as const)
            : ("open" as const);

      const slug = POIDH_CHAIN_SLUG[b.chainId] ?? "base";

      return {
        id: `${b.chainId}-${b.id}`,
        href: `/community/bounties/${b.chainId}/${b.id}`,
        poidhUrl: `https://poidh.xyz/${slug}/bounty/${b.id}`,
        // The bounty's own poidh number, not its reward: Gnars bounties are
        // small enough that hundredths-of-an-ETH collapsed several cards onto
        // the same code, and the legend printed `SURF-01` twice.
        code: `${DISCIPLINE_CODE[discipline]}-${String(b.id).padStart(2, "0")}`,
        category: t(`discipline.${discipline}`),
        title: b.title || b.name,
        description: stripMarkdownImages(b.description),
        eth: eth.toFixed(4),
        usd: formatEthToUsd(eth, ethPrice, toIntlLocale(locale)),
        age: daysAgo === 0 ? tb("card.today") : `${daysAgo}d`,
        chain: CHAIN_NAMES[b.chainId as keyof typeof CHAIN_NAMES] ?? "—",
        status: tb(`status.${statusTone}`),
        statusTone,
        serial: `${String(rank + 1).padStart(3, "0")} / ${String(ranked.length).padStart(3, "0")}`,
        rarity: RANK_RARITY[rank] ?? "common",
      };
    });

    return {
      hand: dealCenterOut(cards),
      pool: total,
      showcaseCount: ranked.length,
      usdTotal: total * ethPrice,
    };
  }, [bounties, ethPrice, locale, t, tb]);

  return (
    <section id="bounties" className="px-4 py-10 sm:px-6 sm:py-18">
      <div className={`${SHELL} flex flex-col gap-6 px-0`}>
        <SectionHeading
          eyebrow={
            <>
              {t("eyebrow")} · <span className="text-[#4ade80]">poidh</span>
            </>
          }
          title={t("title")}
          body={t("body")}
          aside={
            <>
              <StatTile value={`${pool.toFixed(2)} ETH`} label={t("stats.pool")} />
              <StatTile value={showcaseCount} label={t("stats.open")} />
              <StatTile
                value={
                  ethPrice > 0
                    ? formatEthToUsd(pool, ethPrice, toIntlLocale(locale))
                    : `$${Math.round(usdTotal)}`
                }
                label={t("stats.usd")}
              />
            </>
          }
        />

        {isLoading && hand.length === 0 ? (
          <div className="flex h-[420px] items-center justify-center rounded-[22px] border border-border bg-muted/30 font-mono text-sm text-muted-foreground/70">
            …
          </div>
        ) : (
          <BountyCardFan cards={hand} />
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-6 py-5">
          <p className="text-pretty text-[14.5px] text-muted-foreground">
            {t("flowPrefix")} <span className="font-semibold text-foreground">{t("flow")}</span>
          </p>
          <div className="flex gap-2">
            <Link
              href="/community/bounties"
              className="rounded-lg bg-foreground px-4.5 py-2.5 text-sm font-semibold text-background hover:opacity-90"
            >
              {t("create")}
            </Link>
            <a
              href="https://poidh.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border bg-muted/40 px-4.5 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              {t("viewPoidh")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
