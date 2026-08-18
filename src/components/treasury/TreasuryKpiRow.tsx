import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { DAO_ADDRESSES } from "@/lib/config";
import { formatFiatUsd } from "@/lib/i18n/fiat";
import { fetchSettledAuctionCount } from "@/services/dao";
import { getBrlRateForRequest } from "@/services/exchange-rate";
import { loadTreasurySnapshot } from "@/services/treasury";
import { loadSubnetEarnings } from "@/services/treasury-inflows";
import { FiatFallbackNote } from "./FiatFallbackNote";
import { KpiValue } from "./KpiValue";

/** Faded corner marks, straight from the design mock. */
function EthMark() {
  return (
    <svg
      viewBox="0 0 256 417"
      aria-hidden
      className="pointer-events-none absolute right-4 bottom-3 w-11 opacity-20"
    >
      <path d="M127.96 0 125.17 9.5v275.7l2.79 2.78 127.95-75.63z" fill="#c0c8f7" />
      <path d="M127.96 0 0 212.35l127.96 75.63V0z" fill="#e8ecfd" />
      <path d="M127.96 312.19l-1.57 1.92v98.05l1.57 4.59 128.03-180.32z" fill="#c0c8f7" />
      <path d="M127.96 416.75V312.19L0 236.43z" fill="#e8ecfd" />
      <path d="M127.96 287.98l127.95-75.63-127.95-58.16z" fill="#8a95d6" />
      <path d="M0 212.35l127.96 75.63V154.19z" fill="#c0c8f7" />
    </svg>
  );
}

function UsdcMark() {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className="pointer-events-none absolute right-3.5 bottom-3 size-11 opacity-20"
    >
      <circle cx="16" cy="16" r="16" fill="#2775ca" />
      <path
        d="M20.5 18.8c0-2.4-1.4-3.2-4.3-3.5-2-.3-2.5-.8-2.5-1.8s.7-1.6 2.1-1.6c1.3 0 2 .4 2.3 1.5.1.2.3.4.5.4h1.1c.3 0 .5-.2.5-.5v-.1c-.3-1.5-1.5-2.6-3-2.8V8.8c0-.3-.2-.5-.6-.6h-1c-.3 0-.5.2-.6.6v1.5c-2 .3-3.2 1.6-3.2 3.3 0 2.3 1.4 3.2 4.2 3.5 1.9.3 2.5.7 2.5 1.9s-1 2-2.4 2c-1.9 0-2.6-.8-2.8-1.9-.1-.3-.3-.4-.5-.4h-1.2c-.3 0-.5.2-.5.5v.1c.3 1.6 1.3 2.8 3.5 3.1v1.6c0 .3.2.5.6.6h1c.3 0 .5-.2.6-.6v-1.6c2-.3 3.3-1.7 3.3-3.6z"
        fill="#fff"
      />
      <path
        d="M12.9 25.5c-4.7-1.7-7.1-6.9-5.4-11.5 1-2.7 3.1-4.8 5.4-5.7.3-.1.4-.3.4-.6v-1c0-.3-.1-.5-.4-.5-.1 0-.2 0-.3.1-5.7 1.8-8.8 7.9-7 13.6 1 3.3 3.6 5.9 7 7 .3.1.5 0 .6-.3v-1.1c0-.2-.2-.4-.3-.5zm6.5-19.2c-.3-.1-.5 0-.6.3v1.1c0 .3.2.5.4.6 4.7 1.7 7.1 6.9 5.4 11.5-1 2.7-3.1 4.8-5.4 5.7-.3.1-.4.3-.4.6v1c0 .3.1.5.4.5.1 0 .2 0 .3-.1 5.7-1.8 8.8-7.9 7-13.6-1-3.4-3.7-6-7.1-7.1z"
        fill="#fff"
      />
    </svg>
  );
}

/**
 * The four headline cards from the design mock: accent-mixed border and a
 * radial corner tint per card, faded asset mark bottom-right. Accents are the
 * theme's chart tokens, so light mode gets its own palette for free.
 */
export async function TreasuryKpiRow() {
  const t = await getTranslations("treasury.page.kpis");
  const locale = await getLocale();
  const [snapshot, subnet, auctionCount, brlRate] = await Promise.all([
    loadTreasurySnapshot(DAO_ADDRESSES.treasury).catch(() => null),
    loadSubnetEarnings(),
    fetchSettledAuctionCount(),
    getBrlRateForRequest(),
  ]);

  const cards: Array<{
    key: string;
    label: string;
    accent: string;
    value: ReactNode;
    note: string | null;
    extra?: ReactNode;
    mark: ReactNode;
  }> = [
    {
      key: "total",
      label: t("totalValue"),
      accent: "--chart-5",
      value: <KpiValue value={snapshot?.usdTotal ?? null} decimals={2} fiat brlRate={brlRate} />,
      note: snapshot ? t("acrossAssets", { count: snapshot.assetCount }) : null,
      extra: <FiatFallbackNote brlRate={brlRate} className="relative mt-1" />,
      mark: (
        <Image
          src="/red_noggles.png"
          alt=""
          width={80}
          height={30}
          className="pointer-events-none absolute right-4 bottom-3 w-20 object-contain opacity-20"
        />
      ),
    },
    {
      key: "eth",
      label: t("ethBalance"),
      accent: "--chart-1",
      value: <KpiValue value={snapshot?.ethBalance ?? null} decimals={4} unit="ETH" />,
      note:
        snapshot?.nativeEthUsd != null
          ? formatFiatUsd(snapshot.nativeEthUsd, locale, brlRate)
          : null,
      mark: <EthMark />,
    },
    {
      key: "auctions",
      label: t("totalAuctions"),
      accent: "--chart-4",
      value: <KpiValue value={snapshot?.totalAuctionSales ?? null} decimals={4} unit="ETH" />,
      note: auctionCount > 0 ? t("auctionsSettled", { count: auctionCount }) : null,
      mark: <EthMark />,
    },
    {
      key: "subnet",
      label: t("subnetEarnings"),
      accent: "--chart-2",
      value: (
        <KpiValue
          value={subnet?.totalUsdc ?? null}
          decimals={2}
          unit="USDC"
          className="text-[var(--chart-2)]"
        />
      ),
      note: subnet ? t("morpheusClaims", { count: subnet.claimCount }) : null,
      mark: <UsdcMark />,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.key}
          className="relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-xl border bg-card p-6 shadow-sm"
          style={{ borderColor: `color-mix(in oklab, var(${c.accent}) 26%, var(--border))` }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(120% 100% at 100% 100%, color-mix(in oklab, var(${c.accent}) 16%, transparent) 0%, transparent 62%)`,
            }}
          />
          {c.mark}
          <div className="relative text-sm font-medium text-muted-foreground">{c.label}</div>
          <div className="relative">{c.value}</div>
          {c.note && <div className="relative text-xs text-muted-foreground/80">{c.note}</div>}
          {c.extra}
        </div>
      ))}
    </div>
  );
}
