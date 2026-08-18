"use client";

// The inflow rows, split out of TreasuryInflows so "show more" can hold state.
//
// The server fetches the whole window the service can see and hands it down;
// paging happens here. That ordering matters: the auction credits are older than
// the newest handful, so slicing on the server made a working Auction badge
// invisible — the rule fired, nobody ever saw it.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ExternalLink, Gavel } from "lucide-react";
import { AddressDisplay } from "@/components/ui/address-display";
import { Button } from "@/components/ui/button";
import { DAO_ADDRESSES } from "@/lib/config";
import { RIDER_LIST } from "@/lib/gnars-vaults";
import type { InflowAsset, InflowSource, TreasuryInflow } from "@/services/treasury-inflows";

/**
 * Source accents. Not semantic tokens on purpose — like the asset colours below,
 * these identify a kind of income, and the point is telling them apart at a
 * glance rather than following the theme's foreground.
 */
const SOURCE_DOT: Record<InflowSource, string> = {
  auction: "bg-amber-500",
  subnet: "bg-emerald-500",
  splits: "bg-emerald-500",
  transfer: "bg-muted-foreground",
};

const SOURCE_TONE: Record<InflowSource, string> = {
  auction: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  subnet: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  splits: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  transfer: "border-border bg-muted text-muted-foreground",
};

/** Per-asset accent. Deliberately not the semantic tokens — these identify a currency. */
const ASSET_TONE: Record<InflowAsset, string> = {
  ETH: "text-[#627eea]",
  WETH: "text-[#627eea]",
  USDC: "text-[#2775ca]",
};

/** Rows per page. Twenty is what it takes for the auction credits to be on screen. */
const PAGE_SIZE = 20;

/**
 * Addresses we can name. A raw 0x tells a reader nothing about whether the DAO
 * earned the money or someone sent it — and every one of these is already known
 * to the codebase, so the hex was never the best we could do. Anything not in
 * here keeps its truncated address rather than getting a guessed label.
 */
const SPLITS_WAREHOUSE = "0x8fb66f38cf86a3d5e8768f8f1754a24a6c661fb8";
function knownName(address: string, t: (k: string) => string): string | null {
  const a = address.toLowerCase();
  if (a === DAO_ADDRESSES.auction.toLowerCase()) return t("nameAuction");
  if (a === SPLITS_WAREHOUSE) return t("nameWarehouse");
  for (const r of RIDER_LIST) {
    if (r.vault && r.vault.toLowerCase() === a) return t("nameVault");
    if (r.split && r.split.toLowerCase() === a) return t("nameSplit");
  }
  return null;
}

/**
 * ETH is worth ~4 decimals; USDC is a dollar figure and reads wrong with more
 * than two. `maximumFractionDigits` alone would print `0` for auction dust, so
 * very small ETH amounts keep enough significant digits to stay non-zero.
 */
function formatAmount(amount: number, asset: InflowAsset, locale: string): string {
  if (asset === "USDC") {
    return amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (amount > 0 && amount < 0.0001) {
    return amount.toLocaleString(locale, { maximumSignificantDigits: 2 });
  }
  return amount.toLocaleString(locale, { maximumFractionDigits: 4 });
}

function ageLabel(at: string, now: number): string {
  const ms = now - new Date(at).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export function TreasuryInflowsList({
  inflows,
  locale,
  now,
}: {
  inflows: TreasuryInflow[];
  locale: string;
  /** Snapshot clock from the server, so ages do not shift on hydration. */
  now: number;
}) {
  const t = useTranslations("treasury.inflows");
  const [page, setPage] = useState(0);

  // Pages REPLACE each other; they do not accumulate. "Show more" grew this
  // column without bound, which pushed the card next to it back into the
  // mismatched-height problem the NFT preview had just fixed — a layout bug
  // wearing a pagination costume. Swapping pages keeps the column's height a
  // function of PAGE_SIZE instead of how many times someone clicked.
  const pageCount = Math.max(1, Math.ceil(inflows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const start = current * PAGE_SIZE;
  const rows = inflows.slice(start, start + PAGE_SIZE);
  // The last page is usually short. Without fillers the card would shrink on
  // the final click and the whole row would jump, which is the same instability
  // by another route.
  const fillers = pageCount > 1 ? PAGE_SIZE - rows.length : 0;

  // Per SOURCE, then per ASSET. Sources genuinely mix currencies — transfers
  // arrive as ETH, WETH and USDC — and there is no price feed in this component,
  // so each asset keeps its own line. A single blended figure would require a
  // conversion this component cannot honestly make.
  const summary = (["auction", "subnet", "splits", "transfer"] as InflowSource[])
    .map((source) => {
      const rowsFor = inflows.filter((f) => f.source === source);
      const byAsset = new Map<InflowAsset, number>();
      for (const f of rowsFor) byAsset.set(f.asset, (byAsset.get(f.asset) ?? 0) + f.amount);
      return { source, count: rowsFor.length, assets: [...byAsset.entries()] };
    })
    .filter((s) => s.count > 0);

  return (
    <>
      {summary.length > 1 ? (
        <ul className="mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
          {summary.map((s) => (
            <li key={s.source} className="bg-card p-3">
              <div className="flex items-center gap-1.5">
                <span aria-hidden className={`size-1.5 rounded-[2px] ${SOURCE_DOT[s.source]}`} />
                <span className="truncate text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {t(s.source)}
                </span>
              </div>
              {s.assets.map(([asset, amount]) => (
                <p key={asset} className="mt-1.5 font-mono text-sm font-semibold tabular-nums">
                  {formatAmount(amount, asset, locale)}{" "}
                  <span className={`text-[10px] font-medium ${ASSET_TONE[asset]}`}>{asset}</span>
                </p>
              ))}
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t("entryCount", { count: s.count })}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="divide-y divide-border">
        {rows.map((flow) => (
          <li key={flow.hash} className="flex items-center gap-3 py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {knownName(flow.from, t) ? (
                <span className="truncate text-sm">{knownName(flow.from, t)}</span>
              ) : (
                <AddressDisplay
                  address={flow.from}
                  variant="compact"
                  showCopy={false}
                  showExplorer={false}
                  truncateLength={4}
                />
              )}
              {/* Every row carries its origin, not just auctions. The binary
                  "internal = auction" badge could not say where the other three
                  quarters of the income came from. */}
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${SOURCE_TONE[flow.source]}`}
                title={flow.source === "auction" ? t("auctionHint") : undefined}
              >
                {flow.source === "auction" ? <Gavel className="size-3" /> : null}
                {t(flow.source)}
              </span>
            </div>

            <span className="shrink-0 whitespace-nowrap font-mono text-sm font-semibold tabular-nums">
              +{formatAmount(flow.amount, flow.asset, locale)}{" "}
              <span className={ASSET_TONE[flow.asset]}>{flow.asset}</span>
            </span>

            <span className="w-9 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
              {ageLabel(flow.at, now)}
            </span>

            <a
              href={`https://basescan.org/tx/${flow.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("viewTx")}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
            </a>
          </li>
        ))}

        {/* Height reservation. `border-t-transparent` cancels the divider so the
            padding shows up as space, not as empty ruled lines. */}
        {Array.from({ length: fillers }, (_, i) => (
          <li
            key={`filler-${i}`}
            aria-hidden
            className="flex items-center gap-3 border-t-transparent py-2.5"
          >
            <span className="invisible text-sm">&nbsp;</span>
          </li>
        ))}
      </ul>

      {pageCount > 1 ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer"
            disabled={current === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label={t("prevPage")}
          >
            <ChevronLeft className="size-4" />
          </Button>

          {/* Announced politely: with arrows and no readout, a screen-reader
              user gets no confirmation that anything moved. */}
          <span aria-live="polite" className="font-mono text-xs tabular-nums text-muted-foreground">
            {t("range", {
              from: start + 1,
              to: start + rows.length,
              total: inflows.length,
            })}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer"
            disabled={current >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            aria-label={t("nextPage")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </>
  );
}
