"use client";

// "Your positions" promoted from a read-only card at the bottom of the page into
// the hub that answers "what do I have here" for all three venues, with the action
// reachable from the row instead of only from a floating button. The row does not
// transact: it opens the same RewardClaimModal the floater opens (see `onAction`).
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
  /** Deposited asset of THIS row, appended to the venue label. Required for
   *  Morpheus, whose two pools are two rows under one venue name — without it both
   *  printed the same hardcoded "Morpheus · stETH" and the USDC position was
   *  labelled with the wrong token. Venues with a single asset can omit it and keep
   *  the asset baked into their venue string. */
  asset?: string;
  /** What the user deposited, already formatted with its unit. */
  principal: string;
  /** Accrued yield, already formatted with its unit. Empty string = none yet. */
  earned: string;
  /** Unix seconds until which the position is locked. 0 = unlocked. */
  lockedUntil: number;
  action: "harvest" | "withdraw" | "claim";
};

/** Day + month, plus the YEAR whenever the unlock is not in the current year. The
 *  date here is Morpheus' claim lock (`morUnlockAt`), which can sit years out — a
 *  bare "14 de ago" then reads as "next week" for a lock that has not even started
 *  to melt. Same-year dates stay short so the common case is not noisy. */
const fmtDate = (ts: number, locale: string, now: number) => {
  const d = new Date(ts * 1000);
  const sameYear = d.getFullYear() === new Date(now * 1000).getFullYear();
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
};
/** Amounts take the APP locale, never `undefined` (= the browser's). A pt-BR page
 *  read in an en-US browser printed "1,234.5678 stETH" next to "libera em 14 de
 *  ago" — two separator conventions inside one row. */
const fmtAmount = (n: number, locale: string) =>
  n.toLocaleString(locale, { maximumFractionDigits: 4 });

function PositionRow({ row, now, onAction }: { row: Row; now: number; onAction?: () => void }) {
  const t = useTranslations("stake.page.positions");
  const locale = useLocale();
  const locked = row.lockedUntil > now;
  // A "claim" row with nothing accrued has nothing to claim — offering the verb
  // there promised a payout that the modal would then show as zero. Withdraw and
  // harvest are not gated on `earned` (you can always pull your principal).
  const hasSomethingToDo = row.action !== "claim" || row.earned !== "";

  return (
    <div className={cn(ROW_PAD, "flex flex-wrap items-center gap-x-4 gap-y-2")}>
      {/* Full width on mobile: sharing the line with the amounts truncated the
          venue to "Morph…", which is the one thing on the row that must be read. */}
      <div className="w-full min-w-0 sm:w-auto sm:flex-1">
        {/* The asset belongs to the ROW, not to the venue: Morpheus prints one row
            per pool, so its label is composed here instead of being baked into the
            translated venue name. */}
        <div className="truncate text-sm font-semibold">
          {row.asset ? `${t(`venue.${row.venue}`)} · ${row.asset}` : t(`venue.${row.venue}`)}
        </div>
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
          // The string names the locked asset (MOR) because the venueNote beside it
          // talks about the SEVEN-DAY principal lock — a different clock.
          <span className={cn("text-xs", MICRO)}>
            {t("unlocks", { date: fmtDate(row.lockedUntil, locale, now) })}
          </span>
        ) : !hasSomethingToDo ? (
          <span className={cn("text-xs", MICRO)}>{t("noClaim")}</span>
        ) : onAction ? (
          <Button variant="secondary" className={QUIET_BTN} onClick={onAction}>
            {t(`action.${row.action}`)}
          </Button>
        ) : (
          // No handler wired by the parent → no button. A control that does nothing
          // when clicked is worse than the same fact stated as text, which is the
          // rule the `locked` branch above already follows.
          <span className={cn("text-xs", MICRO)}>{t(`ready.${row.action}`)}</span>
        )}
      </div>
    </div>
  );
}

/**
 * `onAction` is what a row's button does. There is exactly one place where a
 * position is actually acted on — the RewardClaimModal behind MorLootbox — so the
 * hub does not grow its own transaction flow: the parent owns the modal's open
 * state and the row opens the SAME modal the floater opens. Without the prop the
 * rows render their action as text (see PositionRow), never as a dead button.
 */
export function PositionsHub({ onAction }: { onAction?: () => void }) {
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
      asset: p.symbol,
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
          <PositionRow key={r.id} row={r} now={now} onAction={onAction} />
        ))}
      </RevealItem>
    </RevealSection>
  );
}
