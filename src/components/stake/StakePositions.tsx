"use client";

// "Your positions" panel on /stake — reads the connected wallet's Morpheus
// Capital stakes (stETH + USDC) and shows, per asset: deposit, MOR earned, when
// the MOR claim-lock lifts (the power lock chosen at deposit) and when the 7-day
// principal lock lifts. Read-only; the actual claim happens in the reward box.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useActiveAccount } from "thirdweb/react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useMorpheusPosition, type MorpheusPoolPosition } from "@/hooks/use-morpheus-position";

const fmt = (n: number, d = 4) => n.toLocaleString(undefined, { maximumFractionDigits: d });
const fmtDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

type T = ReturnType<typeof useTranslations>;

function Badge({ tone, children }: { tone: "ok" | "warn"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "ok"
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      )}
    >
      {children}
    </span>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm tabular-nums">{children}</span>
    </div>
  );
}

function PositionRow({ p, now, t }: { p: MorpheusPoolPosition; now: number; t: T }) {
  const morUnlocked = p.morUnlockAt > 0 && p.morUnlockAt <= now;
  const depUnlocked = p.unlockAt > 0 && p.unlockAt <= now;
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold">
          <span className={cn("size-2 shrink-0 rounded-full", p.asset === "usdc" ? "bg-sky-500" : "bg-emerald-500")} />
          {p.symbol}
        </span>
        <span className="font-mono text-sm tabular-nums">
          {fmt(p.staked)} <span className="text-xs font-normal text-muted-foreground">{p.symbol}</span>
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
        <Metric label={t("earned")}>
          <span className="font-mono font-semibold">{fmt(p.pendingMor)}</span>{" "}
          <span className="text-xs text-muted-foreground">MOR</span>
        </Metric>
        <Metric label={t("morLock")}>
          {p.morUnlockAt <= 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : morUnlocked ? (
            <Badge tone="ok">{t("claimable")}</Badge>
          ) : (
            <Badge tone="warn">{t("lockedUntil", { date: fmtDate(p.morUnlockAt) })}</Badge>
          )}
        </Metric>
        <Metric label={t("principalLock")}>
          {p.unlockAt <= 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : depUnlocked ? (
            <span className="text-emerald-600 dark:text-emerald-400">{t("unlocked")}</span>
          ) : (
            <span>{fmtDate(p.unlockAt)}</span>
          )}
        </Metric>
      </div>
    </div>
  );
}

export function StakePositions() {
  const t = useTranslations("stake.positions");
  const you = useActiveAccount()?.address;
  const pos = useMorpheusPosition(you);
  // Lazy initializer keeps render pure — the 7-day / power locks don't need a
  // live tick; a refresh re-reads the clock.
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  const staked = pos?.pools.filter((p) => p.staked > 0) ?? [];
  const anyLocked = staked.some((p) => p.morUnlockAt > now);

  let body: React.ReactNode;
  if (!you) body = <p className="text-sm text-muted-foreground">{t("connect")}</p>;
  else if (!pos) body = <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  else if (staked.length === 0) body = <p className="text-sm text-muted-foreground">{t("none")}</p>;
  else
    body = (
      <div className="space-y-3">
        {staked.map((p) => (
          <PositionRow key={p.asset} p={p} now={now} t={t} />
        ))}
        <p className="pt-1 text-xs leading-relaxed text-muted-foreground">{t("claimHint")}</p>
        {anyLocked && <p className="text-xs leading-relaxed text-muted-foreground">{t("powerLockNote")}</p>}
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
