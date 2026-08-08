"use client";

// "Your positions" promoted from a read-only card at the bottom of the page into
// the hub that answers "what do I have here" for all three venues, with the action
// on the row instead of behind a floating button.
//
// The section SELF-SUPPRESSES when there is nothing to show. StakePositions (the
// component this replaces on the page) returns its <Card> unconditionally, which
// puts a dead "connect your wallet" box above the social proof for every new
// visitor. Because the section can vanish, it owns its own <SectionHeader/> — a
// header rendered by the parent would be left stranding above nothing.
//
// Live data only, and today that means the Morpheus rows: useVaultRewards cannot
// draw the Morpho row (its VaultReward type carries no principal, and it drops any
// vault whose yield is below dust), and the subnet position has no reader yet.
// Both are separate PRs. The Row type already models them so adding a source is
// additive.
//
// Visual rules this file implements: rows are transparent and separated by one
// hairline (no sub-cards), every earned figure is gold whatever the token, and the
// only button shape on a row is the quiet one. A row that has nothing to do says
// so in text — a pill or a greyed button there reads as a broken control.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RevealItem, RevealSection } from "@/components/stake/Reveal";
import { SectionHeader } from "@/components/stake/SectionHeader";
import {
  CARD,
  CARD_PAD,
  GOLD_TEXT,
  MICRO,
  QUIET_BTN,
  ROW_LIST,
  ROW_PAD,
} from "@/components/stake/stake-ui";
import { Button } from "@/components/ui/button";
import { useMorpheusPosition } from "@/hooks/use-morpheus-position";
import { useUserAddress } from "@/hooks/use-user-address";
import { cn } from "@/lib/utils";

type Venue = "morpho" | "morpheus" | "subnet";

type Row = {
  /** React key. Not the venue: one wallet can hold BOTH Morpheus pools (stETH and
   *  USDC), which are two rows with the same venue. */
  id: string;
  venue: Venue;
  /** What the user deposited, already formatted with its unit. */
  principal: string;
  /** Accrued yield, already formatted with its unit. Empty string = none yet. */
  earned: string;
  /** Unix seconds until which the position is locked. 0 = unlocked. */
  lockedUntil: number;
  action: "harvest" | "withdraw" | "claim";
};

const fmtDate = (ts: number, locale: string) =>
  new Date(ts * 1000).toLocaleDateString(locale, { day: "2-digit", month: "short" });
/** Amounts take the APP locale, never `undefined` (= the browser's). A pt-BR page
 *  read in an en-US browser printed "1,234.5678 stETH" next to "libera em 14 de
 *  ago" — two separator conventions inside one row. */
const fmtAmount = (n: number, locale: string) =>
  n.toLocaleString(locale, { maximumFractionDigits: 4 });

function PositionRow({ row, now }: { row: Row; now: number }) {
  const t = useTranslations("stake.page.positions");
  const locale = useLocale();
  const locked = row.lockedUntil > now;

  return (
    <div className={cn(ROW_PAD, "flex flex-wrap items-center gap-x-4 gap-y-2")}>
      {/* Full width on mobile: sharing the line with the amounts truncated the
          venue to "Morph…", which is the one thing on the row that must be read. */}
      <div className="w-full min-w-0 sm:w-auto sm:flex-1">
        <div className="truncate text-sm font-semibold">{t(`venue.${row.venue}`)}</div>
        <div className={cn("truncate text-xs", MICRO)}>{t(`venueNote.${row.venue}`)}</div>
      </div>

      <div className="min-w-0 flex-1 text-left sm:flex-none sm:text-right">
        <div className="font-mono text-sm tabular-nums">{row.principal}</div>
        {row.earned ? (
          // Gold whatever the token: the unit text says "MOR", the colour doesn't
          // have to. The green identity dot that used to sit here is gone.
          <div className={cn("font-mono text-xs tabular-nums", GOLD_TEXT)}>{`+${row.earned}`}</div>
        ) : row.venue === "subnet" ? (
          // The subnet position genuinely never yields. Saying "no yield yet" here
          // promised a payout that is never coming.
          <div className={cn("text-xs", MICRO)}>{t("backsSubnet")}</div>
        ) : null}
      </div>

      {/* Fixed floor on the action column from `sm` up: a button and a lock date
          are different widths, and letting the column size itself made the amounts
          to its left land on three different x positions. */}
      <div className="flex shrink-0 items-center justify-end sm:min-w-36">
        {locked ? (
          // A lock date is information, not a control. Plain right-aligned micro
          // text: a pill or a disabled button here invites a click that can't work.
          <span className={cn("text-xs", MICRO)}>
            {t("unlocks", { date: fmtDate(row.lockedUntil, locale) })}
          </span>
        ) : (
          <Button variant="secondary" className={QUIET_BTN}>
            {t(`action.${row.action}`)}
          </Button>
        )}
      </div>
    </div>
  );
}

export function PositionsHub() {
  const t = useTranslations("stake.page.positions");
  const locale = useLocale();
  const { address: you } = useUserAddress();
  const live = useMorpheusPosition(you);
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  const rows: Row[] = (live?.pools ?? [])
    .filter((p) => p.staked > 0)
    .map((p) => ({
      id: `morpheus-${p.symbol}`,
      venue: "morpheus" as const,
      principal: `${fmtAmount(p.staked, locale)} ${p.symbol}`,
      earned: p.pendingMor > 0 ? `${fmtAmount(p.pendingMor, locale)} MOR` : "",
      lockedUntil: p.morUnlockAt,
      action: "claim" as const,
    }));

  // Self-suppressing: nothing staked → the section does not exist. This is what
  // makes "positions above the social proof" defensible for a first-time visitor.
  if (rows.length === 0) return null;

  return (
    // The section IS its own card — every section on the page owns one; there is
    // no wrapping island. Rows sit directly on the card, separated by hairlines.
    <RevealSection className={cn(CARD, CARD_PAD, "space-y-4")}>
      <RevealItem>
        <SectionHeader title={t("title")} desc={t("desc")} />
      </RevealItem>

      <RevealItem delay={50} className={ROW_LIST}>
        {rows.map((r) => (
          <PositionRow key={r.id} row={r} now={now} />
        ))}
      </RevealItem>
    </RevealSection>
  );
}
