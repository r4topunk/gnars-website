"use client";

// Prototype: "Suas posições" promoted from a read-only card at the bottom of the
// page into the hub that answers "what do I have here" for all three venues, with
// the action on the row instead of behind a floating button.
//
// Two things the review's original sketch got wrong, corrected here:
//   1. The card must SELF-SUPPRESS when there is nothing to show. The production
//      component returns its <Card> unconditionally, which puts a dead "connect
//      your wallet" box above the social proof for every new visitor. Because the
//      section can vanish, it owns its own <SectionHeader/> — a header rendered by
//      the parent would be left stranding above nothing.
//   2. useVaultRewards cannot draw the Morpho row — its VaultReward type carries
//      no principal and it drops any vault whose yield is below dust. So the rows
//      here are fixtures behind ?demo=1; wiring them is a separate PR.
//
// v3 rules this file implements: rows are transparent and separated by one
// hairline (no sub-cards), every earned figure is gold whatever the token, and the
// only button shape on a row is the quiet one. A row that has nothing to do says
// so in text — a pill or a greyed button there reads as a broken control.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  GOLD_SOLID,
  MICRO,
  PANEL,
  PILL,
  QUIET_BTN,
  ROW_LIST,
  ROW_PAD,
  type PreviewConfig,
} from "@/components/stake/preview/preview-config";
import { SectionHeader } from "@/components/stake/preview/SectionHeader";
import { Button } from "@/components/ui/button";
import { useMorpheusPosition } from "@/hooks/use-morpheus-position";
import { useUserAddress } from "@/hooks/use-user-address";
import { cn } from "@/lib/utils";

type Venue = "morpho" | "morpheus" | "subnet";

type Row = {
  venue: Venue;
  /** What the user deposited, already formatted with its unit. */
  principal: string;
  /** Accrued yield, already formatted with its unit. Empty string = none yet. */
  earned: string;
  /** Unix seconds until which the position is locked. 0 = unlocked. */
  lockedUntil: number;
  action: "harvest" | "withdraw" | "claim";
};

const DAY = 86_400;

/** Fixtures for ?demo=1 — one row per venue, covering the three states a
 *  reviewer needs to judge: collectable, locked, and withdrawable. */
function demoRows(now: number): Row[] {
  return [
    {
      venue: "morpho",
      principal: "500.00 USDC",
      earned: "12.40 USDC",
      lockedUntil: 0,
      action: "harvest",
    },
    {
      venue: "morpheus",
      principal: "1.2000 stETH",
      earned: "84.21 MOR",
      lockedUntil: now + 9 * DAY,
      action: "claim",
    },
    { venue: "subnet", principal: "120.00 MOR", earned: "", lockedUntil: 0, action: "withdraw" },
  ];
}

const fmtDate = (ts: number, locale: string) =>
  new Date(ts * 1000).toLocaleDateString(locale, { day: "2-digit", month: "short" });

function PositionRow({ row, now }: { row: Row; now: number }) {
  const t = useTranslations("stake.preview.positions");
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
          <div
            className="font-mono text-xs tabular-nums"
            style={{ color: GOLD_SOLID }}
          >{`+${row.earned}`}</div>
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

export function PositionsHub({ config }: { config: PreviewConfig }) {
  const t = useTranslations("stake.preview.positions");
  const { address: you } = useUserAddress();
  const live = useMorpheusPosition(you);
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  const liveRows: Row[] = (live?.pools ?? [])
    .filter((p) => p.staked > 0)
    .map((p) => ({
      venue: "morpheus" as const,
      principal: `${p.staked.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${p.symbol}`,
      earned:
        p.pendingMor > 0
          ? `${p.pendingMor.toLocaleString(undefined, { maximumFractionDigits: 4 })} MOR`
          : "",
      lockedUntil: p.morUnlockAt,
      action: "claim" as const,
    }));

  const rows = config.demo ? demoRows(now) : liveRows;

  // Self-suppressing: nothing staked → the section does not exist. This is what
  // makes "positions above the social proof" defensible for a first-time visitor.
  if (rows.length === 0) return null;

  return (
    <section className="space-y-4">
      <SectionHeader title={t("title")} desc={t("desc")}>
        {config.demo && <span className={PILL}>{t("sampleData")}</span>}
      </SectionHeader>

      {/* Horizontal padding belongs to the panel so the hairlines between rows run
          the full width of the surface; the rows own their vertical rhythm. */}
      <div className={cn(PANEL, ROW_LIST, "px-4 sm:px-6")}>
        {rows.map((r) => (
          <PositionRow key={r.venue} row={r} now={now} />
        ))}
      </div>
    </section>
  );
}
