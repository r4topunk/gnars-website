"use client";

// The "fancy" reward-claim panel: a 3D chest (repurposed from the lootbox route)
// as the hero, plus a Claim → Bridge → Distribute stepper and the actual action
// rows. Presentation only — it receives the live state + handlers from
// MorLootbox, which keeps all the on-chain logic. shadcn tokens; PT-BR/EN i18n.
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Check, Loader2, X } from "lucide-react";
import { type Address } from "viem";
import { Button } from "@/components/ui/button";
import type { MorpheusPoolPosition } from "@/hooks/use-morpheus-position";
import type { VaultReward } from "@/hooks/use-vault-rewards";
import type { MorpheusAsset } from "@/lib/morpheus";
import { cn } from "@/lib/utils";

// The r3f Canvas is client-only and heavy — load it only when the modal mounts.
const AnimatedChest3D = dynamic(() => import("@/components/lootbox/AnimatedChest3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });

function tierFor(total: number): "bronze" | "silver" | "gold" | "black" {
  if (total >= 5) return "black";
  if (total >= 0.5) return "gold";
  if (total >= 0.05) return "silver";
  return "bronze";
}

interface Props {
  claimable: MorpheusPoolPosition[];
  /** Rewards that exist but whose claim-lock (the power lock chosen at stake
   * time) has not lifted — shown disabled with the date instead of offering a
   * button that can only revert. */
  claimLocked: MorpheusPoolPosition[];
  distributable: MorpheusPoolPosition[];
  collectable: number;
  vaultRewards: VaultReward[];
  stakedPools: MorpheusPoolPosition[];
  splitBalances: Partial<Record<MorpheusAsset, number>>;
  busyAsset: MorpheusAsset | null;
  busyVault: string | null;
  claimingVault: boolean;
  morpheusBusy: boolean;
  morpheusPhase: string;
  distributing: boolean;
  collecting: boolean;
  nowSec: number;
  onClaim: (asset: MorpheusAsset, referrer: Address) => void;
  onDistribute: (asset: MorpheusAsset, referrer: Address) => void;
  onCollect: () => void;
  onClaimVault: (vault: Address, earnedRaw: bigint) => void;
  onWithdraw: (asset: MorpheusAsset, staked: number) => void;
  onClose: () => void;
}

export function RewardClaimModal({
  claimable,
  claimLocked,
  distributable,
  collectable,
  vaultRewards,
  stakedPools,
  splitBalances,
  busyAsset,
  busyVault,
  claimingVault,
  morpheusBusy,
  morpheusPhase,
  distributing,
  collecting,
  nowSec,
  onClaim,
  onDistribute,
  onCollect,
  onClaimVault,
  onWithdraw,
  onClose,
}: Props) {
  const t = useTranslations("stake");
  const locale = useLocale();

  const totalClaimable = claimable.reduce((s, p) => s + p.pendingMor, 0);
  const totalDistributable = distributable.reduce((s, p) => s + (splitBalances[p.asset] ?? 0), 0);
  const total = totalClaimable + totalDistributable + collectable;

  const stage: "claim" | "distribute" | "collect" | "done" =
    claimable.length > 0
      ? "claim"
      : distributable.length > 0
        ? "distribute"
        : collectable > 0
          ? "collect"
          : "done";

  const isPending = busyAsset != null || collecting;
  // Reward is out of the pool (at the split, or credited in the warehouse) → let
  // the chest reveal it; idle while a tx runs or nothing's waiting.
  const isOpening = (distributable.length > 0 || collectable > 0) && !isPending;

  // Clicking the chest runs the primary next action.
  const runPrimary = () => {
    if (claimable.length > 0) {
      const p = claimable[0];
      onClaim(p.asset, p.referrer);
      return;
    }
    if (distributable.length > 0) {
      const p = distributable[0];
      onDistribute(p.asset, p.referrer);
      return;
    }
    if (collectable > 0) onCollect();
  };

  const steps = [
    { key: "claim", label: t("lootbox.step1"), sub: t("lootbox.step1sub") },
    { key: "bridge", label: t("lootbox.step2"), sub: t("lootbox.step2sub") },
    { key: "distribute", label: t("lootbox.step3"), sub: t("lootbox.step3sub") },
    { key: "collect", label: t("lootbox.step4"), sub: t("lootbox.step4sub") },
  ] as const;

  const order = ["claim", "bridge", "distribute", "collect"];
  const currentIdx =
    stage === "claim" ? 0 : stage === "distribute" ? 2 : stage === "collect" ? 3 : order.length;
  const stepState = (key: string): "done" | "current" | "idle" => {
    const i = order.indexOf(key);
    return i < currentIdx ? "done" : i === currentIdx ? "current" : "idle";
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("lootbox.title")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold tracking-tight">{t("lootbox.title")}</h2>
            <p className="text-xs text-muted-foreground">{t("lootbox.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("lootbox.close")}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3D chest hero */}
        <div className="relative h-64 w-full bg-gradient-to-b from-muted/40 to-transparent">
          <AnimatedChest3D
            onOpen={runPrimary}
            isPending={isPending}
            isOpening={isOpening}
            tier={tierFor(total)}
            disabled={stage === "done" || isPending}
          />
          {total > 0 && (
            <div className="pointer-events-none absolute bottom-3 left-0 right-0 text-center">
              <span className="rounded-full bg-background/80 px-3 py-1 font-mono text-sm font-bold tabular-nums shadow-sm">
                {fmt(total)} MOR
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 p-5">
          {/* Stepper */}
          <ol className="flex items-stretch gap-2">
            {steps.map((s, i) => {
              const st = stepState(s.key);
              return (
                <li key={s.key} className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        st === "done" && "bg-emerald-500 text-white",
                        st === "current" && "bg-primary text-primary-foreground",
                        st === "idle" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {st === "done" ? (
                        <Check className="h-3 w-3" />
                      ) : st === "current" && isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    {i < steps.length - 1 && (
                      <span
                        className={cn(
                          "h-px flex-1",
                          st === "done" ? "bg-emerald-500" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-1.5 text-xs font-semibold",
                      st === "idle" ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {s.label}
                  </p>
                  <p className="text-[11px] leading-snug text-muted-foreground">{s.sub}</p>
                </li>
              );
            })}
          </ol>

          {/* Action rows */}
          <div className="space-y-2">
            {claimable.map((p) => (
              <div
                key={`c-${p.asset}`}
                className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2"
              >
                <span className="text-xs text-muted-foreground">
                  <b className="font-mono text-foreground">{fmt(p.pendingMor)}</b> MOR · {p.symbol}
                </span>
                <Button
                  size="sm"
                  disabled={busyAsset === p.asset && morpheusBusy}
                  onClick={() => onClaim(p.asset, p.referrer)}
                  className="h-7"
                >
                  {busyAsset === p.asset && morpheusBusy
                    ? t("lootbox.claiming")
                    : t("lootbox.claim")}
                </Button>
              </div>
            ))}

            {/* Locked rewards get a row, not a button: the MOR is real, the
                claim would revert until claimLockEnd — the state the contract
                enforces is the state the UI shows. */}
            {claimLocked.map((p) => (
              <div
                key={`cl-${p.asset}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-2"
              >
                <span className="text-xs text-muted-foreground">
                  <b className="font-mono text-foreground/70">{fmt(p.pendingMor)}</b> MOR ·{" "}
                  {p.symbol}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {t("lootbox.claimLocked", {
                    date: new Date(p.morUnlockAt * 1000).toLocaleDateString(locale),
                  })}
                </span>
              </div>
            ))}

            {distributable.map((p) => (
              <div
                key={`d-${p.asset}`}
                className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2"
              >
                <span className="text-xs text-muted-foreground">
                  <b className="font-mono text-foreground">{fmt(splitBalances[p.asset] ?? 0)}</b>{" "}
                  MOR · {p.symbol}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyAsset === p.asset && distributing}
                  onClick={() => onDistribute(p.asset, p.referrer)}
                  className="h-7"
                >
                  {busyAsset === p.asset && distributing
                    ? t("lootbox.distributing")
                    : t("lootbox.distribute")}
                </Button>
              </div>
            ))}

            {collectable > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  <b className="font-mono text-foreground">{fmt(collectable)}</b> MOR ·{" "}
                  {t("lootbox.inWarehouse")}
                </span>
                <Button size="sm" disabled={collecting} onClick={onCollect} className="h-7">
                  {collecting ? t("lootbox.collecting") : t("lootbox.collect")}
                </Button>
              </div>
            )}

            {claimable.length === 0 &&
              distributable.length === 0 &&
              collectable === 0 &&
              vaultRewards.length === 0 && (
                <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {t("lootbox.allCollected")}
                </p>
              )}
          </div>

          {/* Morpho vault yield — the other reward type: one-click harvest per rider vault (USDC on Base) */}
          {vaultRewards.length > 0 && (
            <div className="border-t pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("lootbox.morphoTitle")}
              </p>
              <div className="space-y-2">
                {vaultRewards.map((v) => (
                  <div
                    key={`v-${v.vault}`}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2"
                  >
                    <span className="text-xs text-muted-foreground">
                      <b className="font-mono text-foreground">
                        {v.earned.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </b>{" "}
                      USDC · {v.riderId}
                    </span>
                    <Button
                      size="sm"
                      disabled={busyVault === v.vault && claimingVault}
                      onClick={() => onClaimVault(v.vault, v.earnedRaw)}
                      className="h-7"
                    >
                      {busyVault === v.vault && claimingVault
                        ? t("lootbox.claiming")
                        : t("lootbox.claimYield")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Principal positions (withdraw after 7-day lock) */}
          {stakedPools.length > 0 && (
            <div className="border-t pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("lootbox.positions")}
              </p>
              <div className="space-y-2">
                {stakedPools.map((p) => {
                  const unlocked = p.unlockAt > 0 && nowSec >= p.unlockAt;
                  return (
                    <div
                      key={`w-${p.asset}`}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2"
                    >
                      <span className="text-xs text-muted-foreground">
                        <b className="font-mono text-foreground">{fmt(p.staked)}</b> {p.symbol}
                        {!unlocked && p.unlockAt > 0 && (
                          <span className="ml-1">
                            ·{" "}
                            {t("lootbox.locked", {
                              date: new Date(p.unlockAt * 1000).toLocaleDateString(),
                            })}
                          </span>
                        )}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          !unlocked || (busyAsset === p.asset && morpheusPhase === "withdraw")
                        }
                        onClick={() => onWithdraw(p.asset, p.staked)}
                        className="h-7"
                      >
                        {busyAsset === p.asset && morpheusPhase === "withdraw"
                          ? t("lootbox.withdrawing")
                          : t("lootbox.withdraw")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-[11px] leading-snug text-muted-foreground">{t("lootbox.hint")}</p>
        </div>
      </div>
    </div>
  );
}
