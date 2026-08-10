"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatEthToUsd, useEthPrice } from "@/hooks/use-eth-price";
import { usePoidhBounties, type PoidhBountiesResponse } from "@/hooks/usePoidhBounties";
import { Link } from "@/i18n/navigation";
import { toIntlLocale } from "@/lib/i18n/format";
import { CHAIN_NAMES } from "@/lib/poidh/config";
import { DISCIPLINE_CODE, selectShowcaseBounties, showcasePool } from "./bounty-hand";
import { BountyTradingCard, type BountyCardData, type Rarity } from "./BountyTradingCard";
import { SectionHeading, SHELL, StatTile } from "./primitives";

/** How many cards the hand holds. Six is the widest fan that still reads at 1152px. */
const HAND_SIZE = 6;

/** Card box. Roughly a real trading card's 1:1.5 — a taller box left the art
 *  window stranded above a long empty column. */
const CARD_W = 280;
const CARD_H = 430;
/** How far each card tucks under the one to its right. */
const OVERLAP = 92;

/** Rarity by rank within the hand: richest bounty is the Legendary. */
const RANK_RARITY: Rarity[] = ["legendary", "epic", "rare", "rare", "uncommon", "common"];

function extractImageUrl(text: string): string | null {
  const match = text.match(/!\[.*?\]\((.*?)\)/);
  return match ? match[1] : null;
}

/** The card back shows prose, so the markdown thumbnail is pulled back out. */
function stripMarkdownImages(text: string): string {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/Thumbnail:\s*/gi, "")
    .trim();
}

/**
 * Deal the hand center-out so the Legendary sits in the middle: rank 1 takes the
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

    const cards: BountyCardData[] = top.map(({ bounty: b, discipline, eth }, rank) => {
      // eslint-disable-next-line react-hooks/purity -- intentional render-time clock read for the "Xd" age label
      const daysAgo = Math.max(0, Math.floor((Date.now() - b.createdAt * 1000) / 86_400_000));
      const status = b.isCanceled
        ? ("closed" as const)
        : b.isVoting
          ? ("voting" as const)
          : b.isCompleted
            ? ("closed" as const)
            : ("open" as const);

      const tags = [
        b.isMultiplayer ? tb("card.multiplayer") : null,
        b.hasClaims ? tb("card.hasClaims") : null,
        b.isOpenBounty ? tb("card.videoRequired") : null,
      ].filter((x): x is string => Boolean(x));

      return {
        id: `${b.chainId}-${b.id}`,
        href: `/community/bounties/${b.chainId}/${b.id}`,
        // Code encodes the reward in hundredths of an ETH, padded so a 0.02
        // bounty reads `SK8-02` rather than `SK8-2`.
        code: `${DISCIPLINE_CODE[discipline]}-${String(Math.round(eth * 100)).padStart(2, "0")}`,
        category: t(`discipline.${discipline}`),
        title: b.title || b.name,
        eth: eth.toFixed(4),
        usd: formatEthToUsd(eth, ethPrice, toIntlLocale(locale)),
        age: daysAgo === 0 ? tb("card.today") : `${daysAgo}d`,
        chain: CHAIN_NAMES[b.chainId as keyof typeof CHAIN_NAMES] ?? "—",
        status: tb(`status.${status}`),
        statusTone: status,
        serial: `${String(rank + 1).padStart(3, "0")} / ${String(ranked.length).padStart(3, "0")}`,
        rarity: RANK_RARITY[rank] ?? "common",
        thumbnail: extractImageUrl(b.description),
        tags,
        description: stripMarkdownImages(b.description),
        issuer: `${b.issuer.slice(0, 6)}…${b.issuer.slice(-4)}`,
        deadline: b.deadline
          ? new Date(b.deadline * 1000).toLocaleDateString(toIntlLocale(locale), {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : null,
        claims: b.claims?.length ?? 0,
      };
    });

    return {
      hand: dealCenterOut(cards),
      pool: total,
      showcaseCount: ranked.length,
      usdTotal: total * ethPrice,
    };
  }, [bounties, ethPrice, locale, t, tb]);

  const centre = Math.floor((hand.length - 1) / 2);
  const [selected, setSelected] = useState<number | null>(null);
  /**
   * Card id rather than index: the hand is re-dealt whenever the poidh query
   * refreshes, and an index would leave a different bounty flipped open.
   */
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const active = selected ?? centre;

  /**
   * Two-stage click. A card that is not focused takes focus; the focused card
   * flips. So the first click always brings a card forward to be read, and only
   * a deliberate second click on the same card turns it over.
   */
  const handleCardClick = (i: number, id: string) => {
    if (i !== active) {
      setSelected(i);
      setFlippedId(null);
      return;
    }
    setFlippedId((current) => (current === id ? null : id));
  };

  return (
    <section id="bounties" className="px-6 py-18">
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

        {/* ── The table ─────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[20px] border border-white/[0.07] bg-[radial-gradient(120%_90%_at_50%_8%,rgba(120,70,20,.22),rgba(0,0,0,0)_62%)] bg-[#060606] px-5 pb-11 pt-14">
          <span
            aria-hidden
            className="absolute inset-0 opacity-50 [background-image:repeating-linear-gradient(rgba(255,255,255,.03)_0_1px,transparent_1px_42px),repeating-linear-gradient(90deg,rgba(255,255,255,.03)_0_1px,transparent_1px_42px)]"
          />

          <div className="relative mb-13 flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              {hand.map((card) => (
                <span
                  key={`legend-${card.id}`}
                  className="flex items-center gap-1.5 whitespace-nowrap border-l border-white/[0.15] pl-2.5 text-[11px] text-neutral-400"
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: RARITY_DOT[card.rarity] }}
                  />
                  {card.code}
                </span>
              ))}
            </div>
            <Link
              href="/community/bounties"
              className="whitespace-nowrap text-xs font-semibold text-neutral-400 hover:text-neutral-50"
            >
              {t("viewAll")}
            </Link>
          </div>

          {isLoading && hand.length === 0 ? (
            <div className="flex h-[420px] items-center justify-center font-mono text-sm text-neutral-500">
              …
            </div>
          ) : hand.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-neutral-500">
              {t("empty")}
            </div>
          ) : (
            <>
              {/* Fanned hand — desktop */}
              <div
                className="relative hidden items-start justify-center pb-6 pt-3 transition-transform duration-300 lg:flex"
                style={{
                  height: CARD_H + 90,
                  transform: `translateX(${(centre - active) * (CARD_W - OVERLAP)}px)`,
                }}
              >
                {hand.map((card, i) => {
                  const off = i - active;
                  const a = Math.abs(off);
                  const raised = off === 0;
                  return (
                    <div
                      key={card.id}
                      className="shrink-0 transition-[transform,filter,box-shadow] duration-300"
                      style={{
                        width: CARD_W,
                        height: CARD_H,
                        marginLeft: i === 0 ? 0 : -OVERLAP,
                        transform: `rotate(${off * 9}deg) translateY(${
                          raised ? -30 : Math.pow(a, 1.25) * 26
                        }px) scale(${raised ? 1.07 : Math.max(0.82, 0.95 - a * 0.05)})`,
                        transformOrigin: "50% 130%",
                        filter: raised
                          ? "brightness(1)"
                          : `brightness(${Math.max(0.5, 0.82 - a * 0.1)}) saturate(.85)`,
                        zIndex: raised ? 20 : 10 - a,
                      }}
                    >
                      <BountyTradingCard
                        bounty={card}
                        featured={raised}
                        flipped={flippedId === card.id}
                        shineDelayMs={i * 500}
                        onFrontClick={() => handleCardClick(i, card.id)}
                        onFlipBack={() => setFlippedId(null)}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Straight rail — mobile/tablet. A fan needs width the phone hasn't got. */}
              <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 lg:hidden">
                {hand.map((card, i) => (
                  <div
                    key={card.id}
                    className="shrink-0 snap-center"
                    style={{ width: CARD_W, height: CARD_H }}
                  >
                    {/* No fan to focus into on a phone: every card is already
                        readable, so the first tap flips straight to the brief. */}
                    <BountyTradingCard
                      bounty={card}
                      featured={i === centre}
                      flipped={flippedId === card.id}
                      shineDelayMs={i * 500}
                      onFrontClick={() => setFlippedId((cur) => (cur === card.id ? null : card.id))}
                      onFlipBack={() => setFlippedId(null)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-neutral-900 px-6 py-5">
          <p className="text-pretty text-[14.5px] text-neutral-400">
            {t("flowPrefix")} <span className="font-semibold text-neutral-50">{t("flow")}</span>
          </p>
          <div className="flex gap-2">
            <Link
              href="/community/bounties"
              className="rounded-lg bg-neutral-50 px-4.5 py-2.5 text-sm font-semibold text-neutral-900 hover:opacity-90"
            >
              {t("create")}
            </Link>
            <a
              href="https://poidh.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4.5 py-2.5 text-sm font-medium text-neutral-50 hover:bg-neutral-800"
            >
              {t("viewPoidh")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

const RARITY_DOT: Record<Rarity, string> = {
  legendary: "#f7c948",
  epic: "#a78bfa",
  rare: "#60a5fa",
  uncommon: "#4ade80",
  common: "#9ca3af",
};
