"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, Check, ChevronRight, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConnectButton } from "@/components/ui/ConnectButton";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useExecuteMigration, type MigrationStep } from "@/hooks/use-execute-migration";
import {
  buildRoute,
  formatCoinAmount,
  useCoinQuotes,
  useGnarsOutputQuote,
  useMigratableCoins,
  type MigratableCoin,
  type MigrationTarget,
  type RouteHop,
} from "@/hooks/use-gnars-migration";
import { useUserAddress } from "@/hooks/use-user-address";

export function MigrationWidget() {
  const t = useTranslations("migrate");
  const { address, isConnected } = useUserAddress();
  const { coins, isLoading } = useMigratableCoins(address);

  // Selection is keyed by lowercase address.
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [target, setTarget] = React.useState<MigrationTarget>("gnars");

  const selectedCoins = React.useMemo(
    () => coins.filter((c) => selected.has(c.address.toLowerCase())),
    [coins, selected],
  );

  const toggle = (addr: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = addr.toLowerCase();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(coins.map((c) => c.address.toLowerCase())));
  const clearAll = () => setSelected(new Set());

  if (!isConnected) {
    return (
      <Card className="flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm text-muted-foreground">{t("connectPrompt")}</p>
        <ConnectButton />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 shrink-0" />
        {t("safetyHint")}
      </p>
      <HoldingsList
        coins={coins}
        isLoading={isLoading}
        selected={selected}
        onToggle={toggle}
        onSelectAll={selectAll}
        onClearAll={clearAll}
      />
      {selectedCoins.length > 0 && <RouteMap coins={selectedCoins} />}
      {selectedCoins.length > 0 && (
        <MigrationPreview
          coins={selectedCoins}
          sender={address}
          target={target}
          onTargetChange={setTarget}
        />
      )}
    </div>
  );
}

/** Segmented toggle for the migration target ($GNARS vs ETH). */
function TargetToggle({
  target,
  onChange,
}: {
  target: MigrationTarget;
  onChange: (t: MigrationTarget) => void;
}) {
  const t = useTranslations("migrate");
  return (
    <div className="inline-flex rounded-lg border p-0.5">
      {(["gnars", "eth"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            target === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {opt === "gnars" ? t("preview.targetGnars") : t("preview.targetEth")}
        </button>
      ))}
    </div>
  );
}

/**
 * Step-by-step route map: groups the selected coins by their first hop
 * (content coins funnel through their creator coin; creator coins go straight
 * to ZORA; Gnars content coins go straight to $gnars), then shows the shared
 * tail into $gnars. Purely explanatory — the swap is still one trade.
 */
function RouteMap({ coins }: { coins: MigratableCoin[] }) {
  const t = useTranslations("migrate");

  // Group by the intermediate label the coins share.
  const groups = React.useMemo(() => {
    const map = new Map<string, { via: RouteHop; tail: RouteHop[]; sources: MigratableCoin[] }>();
    for (const coin of coins) {
      const { hops } = buildRoute(coin);
      // hops[0] is the coin itself; hops[1] is the first destination.
      const via = hops[1];
      const key = `${via.kind}:${via.label}`;
      const existing = map.get(key);
      if (existing) existing.sources.push(coin);
      else map.set(key, { via, tail: hops.slice(2), sources: [coin] });
    }
    return Array.from(map.values());
  }, [coins]);

  return (
    <Card className="space-y-4 p-5">
      <div className="text-sm font-medium">{t("route.title")}</div>
      <div className="space-y-4">
        {groups.map((g, i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {g.sources.map((c) => (
                <span
                  key={c.address}
                  className="max-w-[9rem] truncate rounded-md border bg-background px-1.5 py-0.5 text-[11px] leading-tight text-muted-foreground"
                >
                  {c.symbol}
                </span>
              ))}
              <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" />
              <RouteChips hops={[g.via, ...g.tail]} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("route.hopHint")}</p>
    </Card>
  );
}

/** Renders a routing path as connected chips: coin → creator → ZORA → $GNARS. */
function RouteChips({ hops, className }: { hops: RouteHop[]; className?: string }) {
  const chipClass = (kind: RouteHop["kind"]) => {
    switch (kind) {
      case "gnars":
        return "bg-primary/15 text-primary font-semibold";
      case "zora":
        return "bg-accent text-foreground";
      case "creator":
        return "bg-muted text-foreground";
      default:
        return "bg-background text-muted-foreground border";
    }
  };
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ""}`}>
      {hops.map((hop, i) => (
        <React.Fragment key={`${hop.label}-${i}`}>
          <span
            className={`max-w-[10rem] truncate rounded-md px-1.5 py-0.5 text-[11px] leading-tight ${chipClass(hop.kind)}`}
          >
            {hop.label}
          </span>
          {i < hops.length - 1 && (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/** Small round coin avatar: logo when available, symbol initial otherwise. */
function CoinAvatar({ src, symbol }: { src: string | null; symbol: string }) {
  const [errored, setErrored] = React.useState(false);
  if (src && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={symbol}
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full object-cover"
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase text-muted-foreground">
      {symbol.slice(0, 2)}
    </div>
  );
}

function HoldingsList({
  coins,
  isLoading,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  coins: MigratableCoin[];
  isLoading: boolean;
  selected: Set<string>;
  onToggle: (addr: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const t = useTranslations("migrate");

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (coins.length === 0) {
    return <Card className="p-10 text-center text-sm text-muted-foreground">{t("noCoins")}</Card>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <div className="text-sm font-medium">{t("holdingsTitle", { count: coins.length })}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSelectAll}>
            {t("selectAll")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearAll} disabled={selected.size === 0}>
            {t("clear")}
          </Button>
        </div>
      </div>
      <ul className="max-h-[420px] divide-y overflow-y-auto">
        {coins.map((coin) => {
          const key = coin.address.toLowerCase();
          const isChecked = selected.has(key);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onToggle(coin.address)}
                className="flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors hover:bg-accent"
              >
                <Checkbox checked={isChecked} className="pointer-events-none" />
                <CoinAvatar src={coin.logoUrl} symbol={coin.symbol} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{coin.name}</div>
                  <RouteChips hops={buildRoute(coin).hops} className="mt-1" />
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    {formatCoinAmount(BigInt(coin.balance), coin.decimals)}
                  </div>
                  {coin.usdValue !== null && (
                    <div className="text-xs text-muted-foreground">
                      ${coin.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function MigrationPreview({
  coins,
  sender,
  target,
  onTargetChange,
}: {
  coins: MigratableCoin[];
  sender: string | undefined;
  target: MigrationTarget;
  onTargetChange: (t: MigrationTarget) => void;
}) {
  const t = useTranslations("migrate");
  const {
    quotes,
    totalZoraOut,
    directGnarsOut,
    totalEthOut,
    isLoading: quotesLoading,
  } = useCoinQuotes(coins, sender, target);
  const { totalGnars, isLoading: gnarsLoading } = useGnarsOutputQuote(
    totalZoraOut,
    directGnarsOut,
    sender,
  );

  const isEth = target === "eth";
  const total = isEth ? totalEthOut : totalGnars;
  const unit = isEth ? "ETH" : "$GNARS";

  const { execute, isRunning, steps } = useExecuteMigration();

  const routableCount = quotes.filter((q) => q.routable).length;
  const unroutableCount = quotes.filter((q) => !q.routable).length;
  const loading = quotesLoading || gnarsLoading;

  // Only migrate coins that actually have a route (skip the dead-pool ones).
  const routableAddrs = new Set(
    quotes.filter((q) => q.routable).map((q) => q.address.toLowerCase()),
  );
  const routableCoins = coins
    .filter((c) => routableAddrs.has(c.address.toLowerCase()))
    .map((c) => ({
      address: c.address,
      symbol: c.symbol,
      balance: c.balance,
      pairedWith: c.pairedWith?.address ?? null,
    }));

  const onMigrate = () => execute(routableCoins, target);

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("preview.title")}</span>
        {loading && <Spinner className="size-4" />}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{t("preview.receiveAs")}</span>
        <TargetToggle target={target} onChange={onTargetChange} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("preview.selected")}</span>
        <span>{coins.length}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("preview.routable")}</span>
        <span>
          {routableCount}
          {unroutableCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {t("preview.unroutable", { count: unroutableCount })}
            </Badge>
          )}
        </span>
      </div>

      <Separator />

      <div className="flex items-center justify-center py-1">
        <ArrowDown className="size-5 text-muted-foreground" />
      </div>

      <div className="rounded-lg bg-accent/50 p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("preview.youReceive")}
        </div>
        <div className="mt-1 text-2xl font-bold">
          {loading ? "…" : formatCoinAmount(total, 18, isEth ? 6 : 4)}{" "}
          <span className="text-base">{unit}</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t("preview.slippageWarning")}</p>

      {steps.length > 0 && <StepList steps={steps} />}

      <Button
        className="w-full"
        size="lg"
        disabled={loading || isRunning || routableCount === 0}
        onClick={onMigrate}
      >
        {isRunning
          ? t("preview.executing")
          : t("preview.migrateCta", { count: routableCount, token: unit })}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">{t("preview.executionNote")}</p>
    </Card>
  );
}

/** Per-step progress for the sequential migration (one row per swap). */
function StepList({ steps }: { steps: MigrationStep[] }) {
  return (
    <ol className="space-y-1.5 rounded-lg border p-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          {step.status === "done" ? (
            <Check className="size-4 text-primary" />
          ) : step.status === "failed" ? (
            <X className="size-4 text-destructive" />
          ) : step.status === "active" ? (
            <Spinner className="size-4" />
          ) : (
            <span className="size-4 rounded-full border" />
          )}
          <span
            className={
              step.status === "failed"
                ? "text-destructive"
                : step.status === "pending"
                  ? "text-muted-foreground"
                  : ""
            }
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
