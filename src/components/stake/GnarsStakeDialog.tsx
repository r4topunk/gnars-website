"use client";

// Back Gnars on Morpheus — the full "stake on the Gnars subnet" panel, in a big
// premium dialog. Lock MOR into the Gnars Builder subnet on Base: principal
// stays yours (withdrawable after a 7-day lock); the subnet accrues MOR
// emissions for the builder. Reads key off the view-mode-aware user address;
// writes flow through useGnarsSubnetStake (the SA signer). Strings are
// hardcoded EN — this flow is not wired to the next-intl stake namespace.

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountUp } from "@/components/ui/count-up";
import { ConnectButton } from "@/components/ui/ConnectButton";
import { cn } from "@/lib/utils";
import { SUBNET_MIN_DEPOSIT_MOR } from "@/lib/morpheus-builder";
import {
  SUBNET_GOAL_MOR,
  SUBNET_MILESTONES,
  isMilestoneDone,
  type StakeMilestone,
} from "@/lib/stake-milestones";
import { useUserAddress } from "@/hooks/use-user-address";
import { useGnarsSubnet } from "@/hooks/use-gnars-subnet";
import { useGnarsSubnetStake } from "@/hooks/use-gnars-subnet-stake";

const fmt = (n: number, d = 4) => n.toLocaleString("en-US", { maximumFractionDigits: d });
const shortMor = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

// MOR-denominated milestones become tick marks on the progress bar.
const MOR_TICKS = SUBNET_MILESTONES.filter(
  (m): m is StakeMilestone & { amountMor: number } => typeof m.amountMor === "number" && m.amountMor > 0,
);

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function GnarsStakeDialog({ open, onOpenChange }: Props) {
  const { address: you } = useUserAddress();
  const [amount, setAmount] = useState("");
  const [nonce, setNonce] = useState(0);
  // Read the clock once at mount (lazy initializer is pure-in-render safe); the
  // 7-day unlock doesn't need a live tick — a refetch re-reads it.
  const [nowSec] = useState(() => Math.floor(Date.now() / 1000));

  const { position, totalStaked } = useGnarsSubnet(you, nonce);
  const { stake, withdraw, phase, error, isBusy } = useGnarsSubnetStake();

  const walletMor = position?.walletMor ?? 0;
  const amt = Number(amount);
  const belowMin = !amount || amt < Number(SUBNET_MIN_DEPOSIT_MOR);
  const overBalance = amt > walletMor;
  const canStake = !belowMin && !overBalance;

  const pct = Math.min(100, (totalStaked / SUBNET_GOAL_MOR) * 100);
  const pctLabel = Math.round(pct);

  const locked = !!position && position.unlockAt > nowSec;
  const secsLeft = position ? Math.max(0, position.unlockAt - nowSec) : 0;
  const daysLeft = Math.floor(secsLeft / 86400);
  const hoursLeft = Math.floor((secsLeft % 86400) / 3600);

  const ctaLabel =
    phase === "approve"
      ? "approving MOR…"
      : phase === "stake"
        ? "staking on Base…"
        : `Stake ${amount || 0} MOR`;

  const onStake = async () => {
    if (!canStake) return;
    const ok = await stake(amount);
    if (ok) {
      toast.success("Staked on the Gnars subnet", {
        description: `${amount} MOR backing Gnars on Morpheus.`,
      });
      setAmount("");
      setNonce((n) => n + 1);
    } else {
      toast.error("Stake failed", { description: error ?? undefined });
    }
  };

  const onWithdraw = async () => {
    if (!position || position.staked <= 0) return;
    const ok = await withdraw(String(position.staked));
    if (ok) {
      toast.success("Withdrawn", { description: `${fmt(position.staked, 4)} MOR back in your wallet.` });
      setNonce((n) => n + 1);
    } else {
      toast.error("Withdraw failed", { description: error ?? undefined });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] gap-0 overflow-y-auto rounded-3xl border-violet-500/25 bg-background p-0 sm:max-w-[720px]">
        <div className="flex flex-col gap-6 p-6 sm:p-8">
          {/* Header */}
          <div className="pr-6">
            <div className="flex flex-wrap items-center gap-3">
              <Image src="/logos/morpheus.webp" alt="Morpheus" width={40} height={40} className="rounded-lg" />
              <DialogTitle className="text-2xl font-black tracking-tight sm:text-3xl">
                Back Gnars on Morpheus
              </DialogTitle>
              <span className="rounded-full border border-violet-500/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                MOR · Base
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Lock MOR into the Gnars Builder subnet to back the crew with real capital. Your principal stays
              yours — withdrawable after a 7-day lock. Self-custody on Base.
            </p>
          </div>

          {/* Milestones hero */}
          <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-violet-500/[0.02] to-transparent p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Staking milestones
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <CountUp value={totalStaked} decimals={0} className="text-4xl font-black tabular-nums" />
                  <span className="text-sm font-medium text-muted-foreground">
                    / {SUBNET_GOAL_MOR.toLocaleString()} MOR
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-600 dark:text-violet-300">
                {pctLabel}% of the way to the IRL event
              </span>
            </div>

            {/* Progress bar with milestone ticks */}
            <div className="relative mt-5 pb-1 sm:pb-7">
              <div className="h-4 w-full rounded-full bg-violet-500/10 ring-1 ring-violet-500/20">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-violet-600 via-violet-400 to-fuchsia-400 shadow-[0_0_16px_rgba(139,92,246,.6)] transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {MOR_TICKS.map((m) => {
                const left = Math.min(100, (m.amountMor / SUBNET_GOAL_MOR) * 100);
                const done = totalStaked >= m.amountMor;
                return (
                  <div
                    key={m.id}
                    className="pointer-events-none absolute top-0 flex -translate-x-1/2 flex-col items-center"
                    style={{ left: `${left}%` }}
                  >
                    <span
                      className={cn(
                        "h-4 w-1 rounded-full",
                        done ? "bg-violet-600 shadow-[0_0_6px_rgba(139,92,246,.8)] dark:bg-white" : "bg-violet-500/25",
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "mt-1.5 hidden text-[10px] font-semibold tabular-nums sm:block",
                        done ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {shortMor(m.amountMor)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Milestone checklist */}
            <ol className="mt-5 grid gap-2 sm:grid-cols-2">
              {SUBNET_MILESTONES.map((m) => {
                const done = isMilestoneDone(m, totalStaked);
                return (
                  <li key={m.id} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                        done ? "bg-violet-500 text-white" : "border border-border text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
                    </span>
                    <span
                      className={cn(
                        "text-sm leading-snug",
                        done ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {m.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Stake form */}
          <section className="rounded-2xl border border-border/60 bg-muted/20 p-5 sm:p-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total staked
                </div>
                <div className="mt-0.5 text-lg font-black tabular-nums">
                  {fmt(totalStaked, 0)} <span className="text-xs font-medium text-muted-foreground">MOR</span>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Your stake
                </div>
                <div className="mt-0.5 text-lg font-black tabular-nums">
                  {fmt(position?.staked ?? 0, 4)}{" "}
                  <span className="text-xs font-medium text-muted-foreground">MOR</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Balance:{" "}
                <span className="font-medium tabular-nums text-foreground">{fmt(walletMor, 4)}</span> MOR
              </span>
              <button
                type="button"
                onClick={() => setAmount(String(walletMor))}
                disabled={walletMor <= 0}
                className="rounded-full border border-violet-500/40 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-violet-600 transition-colors hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-violet-400"
              >
                Max
              </button>
            </div>

            <Input
              type="number"
              inputMode="decimal"
              placeholder={`min ${SUBNET_MIN_DEPOSIT_MOR} MOR`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2"
            />

            <div className="mt-2 flex flex-wrap gap-2">
              {[100, 500, 1000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-violet-500/50 hover:text-foreground"
                >
                  {v}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(String(walletMor))}
                disabled={walletMor <= 0}
                className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-violet-500/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Max
              </button>
            </div>

            {!you ? (
              <div className="mt-4">
                <ConnectButton />
              </div>
            ) : (
              <Button
                onClick={onStake}
                disabled={isBusy || !canStake}
                className="mt-4 w-full bg-violet-500 text-white hover:bg-violet-600"
              >
                {ctaLabel}
              </Button>
            )}

            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
              You&apos;re backing the builder — rewards accrue to the subnet, not to individual stakers. Every
              action is a transaction on Base.
            </p>
          </section>

          {/* Position / withdraw */}
          {position && position.staked > 0 && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 p-4 sm:p-5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Your position
                </div>
                <div className="mt-0.5 text-lg font-black tabular-nums">
                  {fmt(position.staked, 4)} <span className="text-xs font-medium text-muted-foreground">MOR</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  {locked ? (
                    <>
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        unlocks in {daysLeft}d {hoursLeft}h
                      </span>
                    </>
                  ) : (
                    <span className="font-medium text-violet-600 dark:text-violet-400">
                      unlocked — withdraw anytime
                    </span>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" disabled={isBusy || locked} onClick={onWithdraw}>
                {phase === "withdraw" ? "withdrawing…" : "Withdraw"}
              </Button>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
