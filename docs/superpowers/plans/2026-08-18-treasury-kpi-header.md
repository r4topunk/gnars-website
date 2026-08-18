# Treasury KPI Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Claude Design mock's top section to `/treasury`: synced badge + four accented KPI cards (incl. new Subnet Earnings), everything below unchanged.

**Architecture:** One server component (`TreasuryKpiRow`) loads the extended treasury snapshot plus a new all-time subnet-earnings aggregate and renders all four cards; small client leaves handle CountUp values and the relative-time badge. Accents use `var(--chart-N)` + `color-mix`, so both themes work without hardcoded dark colors.

**Tech Stack:** Next.js 16 App Router (RSC + ISR 300s), next-intl, Tailwind v4 inline styles for color-mix chrome, Alchemy `getAssetTransfers`, Builder subgraph.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-18-treasury-kpi-header-design.md`.
- i18n parity: every new string in `messages/en/treasury.json` AND `messages/pt-br/treasury.json` in the same commit. PT glossary: claim → resgate, leilão, tesouro.
- Fiat rule (from #274): USD figures convert to BRL on pt-br via `formatFiatUsd`/`localizeFiat` + `getBrlRateForRequest`; token quantities (ETH, USDC) never convert. `null` price → em dash, never $0.
- Do not touch anything below the KPI row (Allocation onward).
- Gates before PR: `pnpm exec tsc --noEmit`, `pnpm exec eslint <touched>`, `pnpm exec prettier --write <touched>`, `PATH="$HOME/.nvm/versions/node/v22.12.0/bin:$PATH" pnpm test`.
- Runtime captures (tall-viewport recipe in scratchpad `capture-page.mjs`) EN+PT, desktop+mobile, before PR. No merge without maestro-visible captures.

---

### Task 1: Data — extended snapshot, settled-auction count, subnet earnings

**Files:**
- Modify: `src/services/treasury.ts` (interface + return)
- Modify: `src/services/dao.ts` (settled auction count)
- Modify: `src/services/treasury-inflows.ts` (subnet earnings aggregate)

**Interfaces:**
- Produces: `TreasurySnapshot` gains `nativeEthUsd: number | null`, `assetCount: number`, `generatedAt: number` (epoch ms).
- Produces: `fetchSettledAuctionCount(): Promise<number>` in dao.ts (0 on failure; capped at 1000 by the subgraph page size — comment the cap).
- Produces: `loadSubnetEarnings(): Promise<{ totalUsdc: number; claimCount: number } | null>` in treasury-inflows.ts (null on failure/no key).

- [ ] **Step 1: Extend `TreasurySnapshot`** in `src/services/treasury.ts`:

```ts
export interface TreasurySnapshot {
  /** `null` when a required price was unavailable — NOT the same as $0. */
  usdTotal: number | null;
  ethBalance: number;
  totalAuctionSales: number;
  /** USD value of the native ETH balance; `null` when the ETH price was unavailable. */
  nativeEthUsd: number | null;
  /** Positive-balance assets incl. native ETH — the "across N assets" note. */
  assetCount: number;
  /** Epoch ms when this snapshot was computed (feeds the "Synced" badge). */
  generatedAt: number;
}
```

In `loadTreasurySnapshot`'s return, add:

```ts
      nativeEthUsd: ethUsd == null ? null : nativeEthUsd,
      assetCount: tokenBalances.length + (ethBalance > 0 ? 1 : 0),
      generatedAt: Date.now(),
```

- [ ] **Step 2: Add `fetchSettledAuctionCount`** to `src/services/dao.ts` (below `fetchTotalAuctionSalesWei`):

```ts
const SETTLED_AUCTION_IDS_GQL = /* GraphQL */ `
  query SettledAuctionIds($dao: String!) {
    auctions(where: { dao: $dao, settled: true }, first: 1000) {
      id
    }
  }
`;

/**
 * Count of settled auctions. The subgraph pages at 1000, so this saturates
 * there — at the DAO's ~1/day cadence that is years away, and the KPI note
 * degrades to "1000 auctions settled", not a wrong number.
 */
export const fetchSettledAuctionCount = cache(async (): Promise<number> => {
  try {
    const data = await subgraphQuery<{ auctions?: Array<{ id: string }> }>(
      SETTLED_AUCTION_IDS_GQL,
      { dao: DAO_ADDRESSES.token.toLowerCase() },
    );
    return data.auctions?.length ?? 0;
  } catch {
    return 0;
  }
});
```

- [ ] **Step 3: Add `loadSubnetEarnings`** to `src/services/treasury-inflows.ts` (near `loadTreasuryInflows`):

```ts
export interface SubnetEarnings {
  totalUsdc: number;
  claimCount: number;
}

/**
 * All-time Morpheus subnet earnings: every USDC transfer from the final split
 * to the treasury. The paged inflows feed above is a window and cannot sum
 * honestly; this asks Alchemy for exactly the split→treasury lane and walks
 * every page (the claim history is tiny). `null` = could not determine —
 * the KPI card renders a dash, never a fabricated 0.
 */
export const loadSubnetEarnings = cache(async (): Promise<SubnetEarnings | null> => {
  if (!ALCHEMY_KEY) return null;
  try {
    let totalUsdc = 0;
    let claimCount = 0;
    let pageKey: string | undefined;
    do {
      const res = await fetch(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_getAssetTransfers",
          params: [
            {
              fromAddress: SUBNET_FINAL_SPLIT,
              toAddress: DAO_ADDRESSES.treasury,
              contractAddresses: [USDC],
              category: ["erc20"],
              withMetadata: false,
              maxCount: "0x3e8",
              ...(pageKey ? { pageKey } : {}),
            },
          ],
        }),
        next: { revalidate: 300 },
      });
      if (!res.ok) throw new Error(`Alchemy ${res.status}`);
      const json = (await res.json()) as {
        result?: { transfers?: Array<{ value: number | null }>; pageKey?: string };
        error?: { message?: string };
      };
      if (json.error) throw new Error(json.error.message ?? "Alchemy error");
      for (const t of json.result?.transfers ?? []) {
        totalUsdc += t.value ?? 0;
        claimCount += 1;
      }
      pageKey = json.result?.pageKey;
    } while (pageKey);
    return { totalUsdc, claimCount };
  } catch {
    return null;
  }
});
```

(`DAO_ADDRESSES` is already imported in that file; verify, add if not.)

- [ ] **Step 4: Gates + suite**

Run: `pnpm exec tsc --noEmit && PATH="$HOME/.nvm/versions/node/v22.12.0/bin:$PATH" pnpm test`
Expected: clean / 141 passed.

- [ ] **Step 5: Commit** `feat(treasury): snapshot metadata, auction count, subnet earnings data`

---

### Task 2: UI — SyncedBadge, KpiValue, TreasuryKpiRow, page wiring, i18n

**Files:**
- Create: `src/components/treasury/SyncedBadge.tsx`
- Create: `src/components/treasury/SyncedBadgeLabel.tsx`
- Create: `src/components/treasury/KpiValue.tsx`
- Create: `src/components/treasury/TreasuryKpiRow.tsx`
- Modify: `src/app/[locale]/treasury/page.tsx` (header row + replace 3-card grid)
- Delete: `src/components/treasury/TreasuryBalance.tsx`, `src/components/treasury/TreasuryBalanceClient.tsx` (superseded; only the treasury page used them)
- Modify: `messages/en/treasury.json`, `messages/pt-br/treasury.json`

**Interfaces:**
- Consumes: Task 1's `TreasurySnapshot` fields, `fetchSettledAuctionCount`, `loadSubnetEarnings`; existing `getBrlRateForRequest`, `formatFiatUsd`, `localizeFiat`, `FiatFallbackNote`, `CountUp`.
- Produces: `<TreasuryKpiRow />` (no props, reads DAO_ADDRESSES itself), `<SyncedBadge />` (async server component for the header).

- [ ] **Step 1: i18n keys, both locales.** EN `page.kpis` grows / `page.synced` added:

```json
"synced": "Synced {time}",
"kpis": {
  "totalValue": "Total Treasury Value",
  "ethBalance": "ETH Balance",
  "totalAuctions": "Total Auction Sales",
  "subnetEarnings": "Subnet Earnings",
  "acrossAssets": "across {count} assets",
  "auctionsSettled": "{count} auctions settled",
  "morpheusClaims": "Morpheus · {count} claims"
}
```

PT-BR:

```json
"synced": "Sincronizado {time}",
"kpis": {
  "totalValue": "Valor Total do Tesouro",
  "ethBalance": "Saldo de ETH",
  "totalAuctions": "Total de Vendas em Leilão",
  "subnetEarnings": "Ganhos da Subnet",
  "acrossAssets": "em {count} ativos",
  "auctionsSettled": "{count} leilões concluídos",
  "morpheusClaims": "Morpheus · {count} resgates"
}
```

(Keep the existing PT values for the three current labels — copy them verbatim from the file, the strings above must match what is already there.)

- [ ] **Step 2: `SyncedBadge.tsx`** — async server shell + client time label:

```tsx
import { getTranslations } from "next-intl/server";
import { DAO_ADDRESSES } from "@/lib/config";
import { loadTreasurySnapshot } from "@/services/treasury";
import { SyncedBadgeLabel } from "./SyncedBadgeLabel";

/** "Synced Xm ago" pill — bound to when the ISR snapshot was computed. */
export async function SyncedBadge() {
  const t = await getTranslations("treasury.page");
  let generatedAt: number | null = null;
  try {
    generatedAt = (await loadTreasurySnapshot(DAO_ADDRESSES.treasury)).generatedAt;
  } catch {
    return null;
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
      <span aria-hidden className="size-1.5 rounded-full bg-[var(--chart-2)]" />
      <SyncedBadgeLabel generatedAt={generatedAt} template={t("synced")} />
    </div>
  );
}
```

`SyncedBadgeLabel.tsx` (client — relative time must be computed against the
viewer's clock, an ISR page's server render can be minutes old):

```tsx
"use client";

import { useEffect, useState } from "react";
import { useFormatter } from "next-intl";

export function SyncedBadgeLabel({
  generatedAt,
  template,
}: {
  generatedAt: number;
  template: string;
}) {
  const format = useFormatter();
  // Server HTML carries no time (ISR staleness would lie); filled on mount.
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    setLabel(format.relativeTime(generatedAt, Date.now()));
  }, [format, generatedAt]);
  if (label == null) return <span>{template.replace("{time}", "").trim()}</span>;
  return <span>{template.replace("{time}", label)}</span>;
}
```

NOTE for implementer: `template.replace` is used because the label composes a
translated wrapper with a runtime-formatted fragment; pass the already-rendered
`t("synced", { time })`? No — `time` is client-computed. Keep the replace, it is
the smallest honest composition. (next-intl's `t.rich` is for elements, not
client-computed strings.)

- [ ] **Step 3: `KpiValue.tsx`** (client) — CountUp value line with optional fiat conversion:

```tsx
"use client";

import { useLocale } from "next-intl";
import { CountUp } from "@/components/ui/count-up";
import { localizeFiat } from "@/lib/i18n/fiat";

interface KpiValueProps {
  /** `null` = value unavailable — renders an em dash, never 0. */
  value: number | null;
  decimals: number;
  /** Token unit ("ETH", "USDC") rendered after the number. Omit for fiat. */
  unit?: string;
  /** Convert to BRL on pt-br (Total Treasury Value only). */
  fiat?: boolean;
  brlRate?: number | null;
  className?: string;
}

export function KpiValue({ value, decimals, unit, fiat, brlRate = null, className }: KpiValueProps) {
  const locale = useLocale();
  if (value == null) {
    return <span className="font-mono text-2xl font-bold text-muted-foreground">—</span>;
  }
  const { value: displayValue, currency } = fiat
    ? localizeFiat(value, locale, brlRate)
    : { value, currency: null };
  const prefix =
    currency === "BRL" ? "R$ " : currency === "USD" ? (locale === "pt-br" ? "US$ " : "$") : "";
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className={`font-mono text-2xl font-bold tabular-nums tracking-tight ${className ?? ""}`}>
        {prefix}
        <CountUp value={displayValue} decimals={decimals} className="tabular-nums" />
      </span>
      {unit && <span className="text-xs font-medium text-muted-foreground">{unit}</span>}
    </span>
  );
}
```

- [ ] **Step 4: `TreasuryKpiRow.tsx`** (server) — the four cards:

```tsx
import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { DAO_ADDRESSES } from "@/lib/config";
import { formatFiatUsd } from "@/lib/i18n/fiat";
import { fetchSettledAuctionCount } from "@/services/dao";
import { getBrlRateForRequest } from "@/services/exchange-rate";
import { loadSubnetEarnings } from "@/services/treasury-inflows";
import { loadTreasurySnapshot } from "@/services/treasury";
import { FiatFallbackNote } from "./FiatFallbackNote";
import { KpiValue } from "./KpiValue";

/** Faded corner marks, straight from the design mock. */
function EthMark() {
  return (
    <svg viewBox="0 0 256 417" aria-hidden className="pointer-events-none absolute right-4 bottom-3 w-11 opacity-20">
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
    <svg viewBox="0 0 32 32" aria-hidden className="pointer-events-none absolute right-3.5 bottom-3 size-11 opacity-20">
      <circle cx="16" cy="16" r="16" fill="#2775ca" />
      <path d="M20.5 18.8c0-2.4-1.4-3.2-4.3-3.5-2-.3-2.5-.8-2.5-1.8s.7-1.6 2.1-1.6c1.3 0 2 .4 2.3 1.5.1.2.3.4.5.4h1.1c.3 0 .5-.2.5-.5v-.1c-.3-1.5-1.5-2.6-3-2.8V8.8c0-.3-.2-.5-.6-.6h-1c-.3 0-.5.2-.6.6v1.5c-2 .3-3.2 1.6-3.2 3.3 0 2.3 1.4 3.2 4.2 3.5 1.9.3 2.5.7 2.5 1.9s-1 2-2.4 2c-1.9 0-2.6-.8-2.8-1.9-.1-.3-.3-.4-.5-.4h-1.2c-.3 0-.5.2-.5.5v.1c.3 1.6 1.3 2.8 3.5 3.1v1.6c0 .3.2.5.6.6h1c.3 0 .5-.2.6-.6v-1.6c2-.3 3.3-1.7 3.3-3.6z" fill="#fff" />
      <path d="M12.9 25.5c-4.7-1.7-7.1-6.9-5.4-11.5 1-2.7 3.1-4.8 5.4-5.7.3-.1.4-.3.4-.6v-1c0-.3-.1-.5-.4-.5-.1 0-.2 0-.3.1-5.7 1.8-8.8 7.9-7 13.6 1 3.3 3.6 5.9 7 7 .3.1.5 0 .6-.3v-1.1c0-.2-.2-.4-.3-.5zm6.5-19.2c-.3-.1-.5 0-.6.3v1.1c0 .3.2.5.4.6 4.7 1.7 7.1 6.9 5.4 11.5-1 2.7-3.1 4.8-5.4 5.7-.3.1-.4.3-.4.6v1c0 .3.1.5.4.5.1 0 .2 0 .3-.1 5.7-1.8 8.8-7.9 7-13.6-1-3.4-3.7-6-7.1-7.1z" fill="#fff" />
    </svg>
  );
}

/** Card chrome per accent: mixed border + corner tint, theme-aware via tokens. */
function accentStyle(accentVar: string) {
  return {
    borderColor: `color-mix(in oklab, var(${accentVar}) 26%, var(--border))`,
  } as const;
}

function tintStyle(accentVar: string) {
  return {
    background: `radial-gradient(120% 100% at 100% 100%, color-mix(in oklab, var(${accentVar}) 16%, transparent) 0%, transparent 62%)`,
  } as const;
}

export async function TreasuryKpiRow() {
  const t = await getTranslations("treasury.page.kpis");
  const locale = await getLocale();
  const [snapshotResult, subnet, auctionCount, brlRate] = await Promise.all([
    loadTreasurySnapshot(DAO_ADDRESSES.treasury).then(
      (s) => ({ ok: true as const, s }),
      () => ({ ok: false as const, s: null }),
    ),
    loadSubnetEarnings(),
    fetchSettledAuctionCount(),
    getBrlRateForRequest(),
  ]);
  const snapshot = snapshotResult.s;

  const cards = [
    {
      key: "total",
      label: t("totalValue"),
      accent: "--chart-5",
      value: (
        <KpiValue value={snapshot?.usdTotal ?? null} decimals={2} fiat brlRate={brlRate} />
      ),
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
          style={accentStyle(c.accent)}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0" style={tintStyle(c.accent)} />
          {c.mark}
          <div className="relative text-sm font-medium text-muted-foreground">{c.label}</div>
          <div className="relative">{c.value}</div>
          {c.note && <div className="relative text-xs text-muted-foreground/80">{c.note}</div>}
          {"extra" in c ? c.extra : null}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Wire `page.tsx`.** Replace the whole `{/* KPIs */}` grid (the three `<Card>` blocks) with:

```tsx
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card p-6">
                  <MetricSkeleton />
                </div>
              ))}
            </div>
          }
        >
          <TreasuryKpiRow />
        </Suspense>
```

and evolve the page header block to the mock's split row:

```tsx
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{t("page.title")}</h1>
            <p className="text-muted-foreground">{t("page.description")}</p>
          </div>
          <Suspense fallback={null}>
            <SyncedBadge />
          </Suspense>
        </div>
```

Remove now-unused imports (`TreasuryBalance`, `Card*` if unused elsewhere in the file — Card is still used? the three KPI Card blocks were its only use besides none: check; if unused remove import). Delete `TreasuryBalance.tsx` and `TreasuryBalanceClient.tsx`.

- [ ] **Step 6: Gates**

Run: `pnpm exec tsc --noEmit && pnpm exec eslint <touched> && pnpm exec prettier --write <touched> && PATH=... pnpm test`
Expected: all clean, 141 passed.

- [ ] **Step 7: Commit** `feat(treasury): accented KPI header with synced badge and subnet earnings`

---

### Task 3: Runtime verification + PR

- [ ] **Step 1:** Dev server (reuse running one, HMR): capture with scratchpad `capture-page.mjs` (tall-viewport recipe): EN desktop 1440, EN mobile 390, PT desktop 1440, PT mobile 390. Verify: 4 cards with accent borders/tints + marks; USDC value green; notes real (asset count, ETH→fiat converted on PT, settled count, claims count); synced badge shows relative minutes; TTV converts to R$ on PT; ETH/USDC quantities NOT converted; below-the-fold sections unchanged.
- [ ] **Step 2:** Also capture PT with the exchange-rate service temporarily patched to `return null` (fallback note visible in the Total card), then revert the patch.
- [ ] **Step 3:** PR to upstream: `gh pr create --repo r4topunk/gnars-website --base main --head sktbrd:feat/treasury-kpi-header ...`, report URL + captures. NO merge without approval.
