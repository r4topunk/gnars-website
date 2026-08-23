"use client";

// The inflow rows, split out of TreasuryInflows so "show more" can hold state.
//
// The server fetches the whole window the service can see and hands it down;
// paging happens here. That ordering matters: the auction credits are older than
// the newest handful, so slicing on the server made a working Auction badge
// invisible — the rule fired, nobody ever saw it.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ExternalLink, Gavel, Loader2 } from "lucide-react";
import { AVATAR } from "@/components/treasury/SponsorshipYield";
import { AddressDisplay } from "@/components/ui/address-display";
import { Button } from "@/components/ui/button";
import { DAO_ADDRESSES } from "@/lib/config";
import { RIDER_LIST } from "@/lib/gnars-vaults";
import type {
  InflowAsset,
  InflowPage,
  InflowSource,
  TreasuryInflow,
} from "@/services/treasury-inflows";

/**
 * Source accents. Not semantic tokens on purpose — like the asset colours below,
 * these identify a kind of income, and the point is telling them apart at a
 * glance rather than following the theme's foreground.
 */
const SOURCE_DOT: Record<InflowSource, string> = {
  auction: "bg-amber-500",
  subnet: "bg-emerald-500",
  swap: "bg-sky-500",
  droposal: "bg-violet-500",
  secondary: "bg-rose-500",
  // Generic splits is the "a split we have not mapped" bucket — it must never
  // borrow a product's colour, least of all the subnet green it used to share.
  splits: "bg-foreground/50",
  transfer: "bg-muted-foreground",
};

const SOURCE_TONE: Record<InflowSource, string> = {
  auction: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  subnet: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  swap: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  droposal: "border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  secondary: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  // Unmapped split: tinted just enough to say "known mechanism, unknown
  // product" without wearing any product's brand colour.
  splits: "border-foreground/20 bg-foreground/5 text-foreground/70",
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
 *
 * `icon` follows the same rule as the name: a known entity gets its real mark
 * (assets that already ship with the site), an unknown one falls back to the
 * address identicon. No approximated logos — a wrong mark is worse than a
 * generic one.
 */
const SPLITS_WAREHOUSE = "0x8fb66f38cf86a3d5e8768f8f1754a24a6c661fb8";
type EntityIcon = {
  src: string;
  /** "contain" pads logos that are not square portraits (the noggles). */
  fit: "cover" | "contain";
  /** Face-crop values for rider cut-outs, same numbers the sponsorship card uses. */
  size?: string;
  pos?: string;
};
type KnownEntity = { name: string; icon?: EntityIcon };

function knownEntity(
  address: string,
  source: TreasuryInflow["source"],
  t: (k: string) => string,
): KnownEntity | null {
  const a = address.toLowerCase();
  if (a === DAO_ADDRESSES.auction.toLowerCase())
    return { name: t("nameAuction"), icon: { src: "/red_noggles.png", fit: "contain" } };
  if (a === SPLITS_WAREHOUSE) {
    // The warehouse is a conduit, not an earner — when the receipt proved which
    // product's split paid through it, the row wears that product's identity.
    if (source === "subnet")
      return { name: t("nameWarehouse"), icon: { src: "/logos/morpheus.webp", fit: "cover" } };
    return { name: t("nameWarehouse") };
  }
  for (const r of RIDER_LIST) {
    if ((r.vault && r.vault.toLowerCase() === a) || (r.split && r.split.toLowerCase() === a)) {
      const av = AVATAR[r.id];
      return {
        name: r.vault && r.vault.toLowerCase() === a ? t("nameVault") : t("nameSplit"),
        icon: { src: av.src, fit: "cover", size: av.size, pos: av.pos },
      };
    }
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
  nextPageKey,
  locale,
  now,
}: {
  inflows: TreasuryInflow[];
  /** Cursor into deeper history; `null` means the server saw the very end. */
  nextPageKey: string | null;
  locale: string;
  /** Snapshot clock from the server, so ages do not shift on hydration. */
  now: number;
}) {
  const t = useTranslations("treasury.inflows");
  const [page, setPage] = useState(0);
  // History fetched past the server's first window. `cursor === null` means
  // the chain's history is EXHAUSTED — deliberately a different state from
  // "not fetched yet" (a string) so the next-arrow can tell "disabled because
  // done" from "click me to load more". Conflating those two is the empty-
  // backer-list bug wearing pagination clothes.
  const [extra, setExtra] = useState<TreasuryInflow[]>([]);
  const [cursor, setCursor] = useState<string | null>(nextPageKey);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const all = [...inflows, ...extra];

  // Pages REPLACE each other; they do not accumulate. "Show more" grew this
  // column without bound, which pushed the card next to it back into the
  // mismatched-height problem the NFT preview had just fixed — a layout bug
  // wearing a pagination costume. Swapping pages keeps the column's height a
  // function of PAGE_SIZE instead of how many times someone clicked.
  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const start = current * PAGE_SIZE;
  const rows = all.slice(start, start + PAGE_SIZE);
  // The last page is usually short. Without fillers the card would shrink on
  // the final click and the whole row would jump, which is the same instability
  // by another route.
  const fillers = pageCount > 1 ? PAGE_SIZE - rows.length : 0;

  const onLastLoadedPage = current >= pageCount - 1;

  async function goNext() {
    setLoadFailed(false);
    if (!onLastLoadedPage) {
      setPage((p) => p + 1);
      return;
    }
    if (!cursor || loading) return;
    // At the edge of what is loaded, the arrow FETCHES instead of dead-ending.
    // An indexer page is 50 raw transfers filtered down to tracked assets, so
    // one page can yield few visible rows; chain a couple of fetches until a
    // screenful arrives or the history truly ends. Bounded — this must never
    // become "load everything".
    setLoading(true);
    try {
      let got: TreasuryInflow[] = [];
      let next: string | null = cursor;
      for (let hops = 0; next && got.length < PAGE_SIZE && hops < 4; hops++) {
        const res = await fetch(`/api/treasury/inflows?pageKey=${encodeURIComponent(next)}`);
        if (!res.ok) throw new Error("inflows page failed");
        const data = (await res.json()) as InflowPage;
        got = [...got, ...data.inflows];
        next = data.nextPageKey;
      }
      setExtra((e) => [...e, ...got]);
      setCursor(next);
      if (got.length > 0) setPage((p) => p + 1);
    } catch {
      // Reported, not silenced: the failure line renders under the pager and
      // the cursor is kept so the same click can retry.
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  // Per SOURCE, then per ASSET. Sources genuinely mix currencies — transfers
  // arrive as ETH, WETH and USDC — and there is no price feed in this component,
  // so each asset keeps its own line. A single blended figure would require a
  // conversion this component cannot honestly make.
  const summary = (
    ["auction", "secondary", "subnet", "swap", "droposal", "splits", "transfer"] as InflowSource[]
  )
    .map((source) => {
      const rowsFor = all.filter((f) => f.source === source);
      const byAsset = new Map<InflowAsset, number>();
      for (const f of rowsFor) byAsset.set(f.asset, (byAsset.get(f.asset) ?? 0) + f.amount);
      return { source, count: rowsFor.length, assets: [...byAsset.entries()] };
    })
    .filter((s) => s.count > 0);

  // Column count DERIVED from the source count, so rows come out balanced —
  // never one orphan tile trailing a full row. The inner ceil is "how many
  // rows would a max-4 grid need", the outer spreads the tiles evenly over
  // those rows:
  //
  //   sources | cols | rows
  //   --------+------+------
  //      4    |  4   | 4
  //      5    |  3   | 3+2   (today: auction, subnet, swap, splits, transfer)
  //      6    |  3   | 3+3   (the day a Secondary/Seaport source lands)
  //      7    |  4   | 4+3
  //
  // Deliberately NOT auto-fit/minmax: that makes composition a function of
  // card width, so the orphan comes back intermittently at in-between
  // breakpoints — a reproducible defect traded for a flaky one. Keep this
  // deterministic-by-count even if the two ceils look "simplifiable".
  const tileCols =
    summary.length <= 4
      ? summary.length
      : Math.ceil(summary.length / Math.ceil(summary.length / 4));

  return (
    <>
      {summary.length > 1 ? (
        <ul
          className="mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-[repeat(var(--tile-cols),minmax(0,1fr))]"
          style={{ "--tile-cols": tileCols } as React.CSSProperties}
        >
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
          {/* The gap-px/bg-border trick draws hairlines between cells — but an
              UNOCCUPIED cell (splits has no entries today) shows as a solid
              block of border colour. Card-coloured fillers close the row, one
              set per breakpoint because the column count differs. */}
          {Array.from({ length: (tileCols - (summary.length % tileCols)) % tileCols }, (_, i) => (
            <li key={`pad-sm-${i}`} aria-hidden className="hidden bg-card sm:block" />
          ))}
          {Array.from({ length: (2 - (summary.length % 2)) % 2 }, (_, i) => (
            <li key={`pad-xs-${i}`} aria-hidden className="bg-card sm:hidden" />
          ))}
        </ul>
      ) : null}

      {/* Column headers, like the reference design — the grid below shares
          this exact template, which is what actually aligns the columns. */}
      <div className="hidden gap-x-3 border-b border-border pb-2 text-[11px] font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1.3fr)_116px_minmax(0,1fr)_44px_20px]">
        <span>{t("colFrom")}</span>
        <span>{t("colSource")}</span>
        <span className="text-right">{t("colAmount")}</span>
        <span className="text-right">{t("colAge")}</span>
        <span aria-hidden />
      </div>

      <ul className="divide-y divide-border">
        {rows.map((flow) => {
          const entity = knownEntity(flow.from, flow.source, t);
          return (
            // One grid, five fixed columns from `sm` up — a row is not a bag of
            // floats, and every cell starts where the header says it does.
            // Below `sm` the same children wrap: sender+badge line, amount
            // right, age+link trailing.
            <li
              key={flow.hash}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 sm:grid sm:grid-cols-[minmax(0,1.3fr)_116px_minmax(0,1fr)_44px_20px]"
            >
              <div className="flex min-w-0 flex-1 basis-40 items-center gap-2 sm:flex-none">
                {entity ? (
                  <>
                    <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-muted">
                      {entity.icon ? (
                        entity.icon.size ? (
                          /* eslint-disable-next-line @next/next/no-img-element -- 32px local asset; the sponsorship card's verified face crop */
                          <img
                            src={entity.icon.src}
                            alt=""
                            className="size-full object-cover"
                            style={{
                              objectPosition: entity.icon.pos,
                              scale: String(parseFloat(entity.icon.size) / 100),
                            }}
                          />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element -- 32px local asset */
                          <img
                            src={entity.icon.src}
                            alt=""
                            className={
                              entity.icon.fit === "contain"
                                ? "size-full object-contain p-1"
                                : "size-full object-cover"
                            }
                          />
                        )
                      ) : (
                        /* A named entity with no known mark still gets ITS
                           identicon (seeded by address, same generator the
                           hex rows use) — never a bare text row: one ragged
                           left edge and the whole column stops reading as a
                           column. */
                        /* eslint-disable-next-line @next/next/no-img-element -- tiny remote identicon, same source AddressDisplay uses */
                        <img
                          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${flow.from.toLowerCase()}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                          alt=""
                          className="size-full"
                        />
                      )}
                    </span>
                    <span className="truncate text-sm">{entity.name}</span>
                  </>
                ) : (
                  <AddressDisplay
                    address={flow.from}
                    variant="compact"
                    showCopy={false}
                    showExplorer={false}
                    truncateLength={4}
                  />
                )}
              </div>

              <span className="shrink-0">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${SOURCE_TONE[flow.source]}`}
                  title={flow.source === "auction" ? t("auctionHint") : undefined}
                >
                  {flow.source === "auction" ? <Gavel className="size-3" /> : null}
                  {t(flow.source)}
                </span>
              </span>

              <span className="ml-auto shrink-0 font-mono text-sm font-semibold whitespace-nowrap tabular-nums sm:ml-0 sm:justify-self-end">
                +{formatAmount(flow.amount, flow.asset, locale)}{" "}
                <span className={ASSET_TONE[flow.asset]}>{flow.asset}</span>
              </span>

              <span className="shrink-0 text-right font-mono text-[11px] text-muted-foreground sm:justify-self-end">
                {ageLabel(flow.at, now)}
              </span>

              <a
                href={`https://basescan.org/tx/${flow.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("viewTx")}
                className="shrink-0 text-muted-foreground hover:text-foreground sm:justify-self-end"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </li>
          );
        })}

        {/* Height reservation. `border-t-transparent` cancels the divider so the
            padding shows up as space, not as empty ruled lines. The `h-8` block
            copies the real rows' tallest element (the 32px avatar), so a filler
            occupies exactly one row — a text-height filler under-reserved and
            the card still shrank on the last page. */}
        {Array.from({ length: fillers }, (_, i) => (
          <li
            key={`filler-${i}`}
            aria-hidden
            className="flex items-center gap-3 border-t-transparent py-2.5"
          >
            <span className="invisible block h-8" />
          </li>
        ))}
      </ul>

      {pageCount > 1 || cursor ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer"
            disabled={current === 0 || loading}
            onClick={() => {
              setLoadFailed(false);
              setPage((p) => Math.max(0, p - 1));
            }}
            aria-label={t("prevPage")}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span aria-live="polite" className="font-mono text-xs tabular-nums text-muted-foreground">
            {loadFailed ? (
              <span className="text-destructive">{t("loadFailed")}</span>
            ) : (
              /* Announced politely: with arrows and no readout, a screen-reader
                 user gets no confirmation that anything moved. The total stays
                 open-ended ("34+") while a cursor remains — printing a closed
                 count for an unfinished history would be a small lie. */
              t("range", {
                from: start + 1,
                to: start + rows.length,
                total: cursor ? `${all.length}+` : String(all.length),
              })
            )}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="size-8 cursor-pointer"
            // Truly done only when the cursor is spent AND we sit on the last
            // page. While loading it stays enabled-looking but inert via the
            // guard in goNext, and shows the spinner instead of the chevron.
            disabled={onLastLoadedPage && cursor === null}
            onClick={() => void goNext()}
            aria-label={t("nextPage")}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        </div>
      ) : null}
    </>
  );
}
