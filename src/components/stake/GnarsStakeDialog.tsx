"use client";

// Back Gnars on Morpheus — the full "stake on the Gnars subnet" panel, in a big
// premium dialog. Lock MOR into the Gnars Builder subnet on Base: principal
// stays yours (withdrawable after a 7-day lock); the subnet accrues MOR
// emissions for the builder. Reads key off the view-mode-aware user address;
// writes flow through useGnarsSubnetStake (the SA signer).
//
// Copy lives in `stake.page.subnet.dialog.*` — the same namespace root as
// SubnetSection, which owns the CTA that opens this dialog. Sharing the root
// means the milestone checklist reads the very labels the section renders
// (`…subnet.milestones.<id>`) instead of a duplicated English copy that would
// drift the next time the campaign changes.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { AlertTriangle, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/ui/ConnectButton";
import { CountUp } from "@/components/ui/count-up";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useGnarsSubnet } from "@/hooks/use-gnars-subnet";
import { useGnarsSubnetStake } from "@/hooks/use-gnars-subnet-stake";
import { useUserAddress } from "@/hooks/use-user-address";
import { toIntlLocale } from "@/lib/i18n/format";
import { SUBNET_MIN_DEPOSIT_MOR } from "@/lib/morpheus-builder";
import { isMilestoneDone, SUBNET_GOAL_MOR, SUBNET_MILESTONES } from "@/lib/stake-milestones";
import { cn } from "@/lib/utils";

// Locale-aware on purpose: these MOR figures sit next to a CountUp and a section
// total that already format per locale, so a hardcoded "en-US" here printed
// "10,000" beside "10.000" in pt-BR.
const fmt = (n: number, locale: string, d = 4) =>
  n.toLocaleString(locale, { maximumFractionDigits: d });
const shortMor = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

// Milestones become tick marks on the progress bar. Every milestone is
// MOR-denominated since the ladder became the amplification ladder — the two
// ungated entries this used to filter out (subnet live, first 10 backers) are gone.
const MOR_TICKS = SUBNET_MILESTONES.filter((m) => m.amountMor > 0);

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function GnarsStakeDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("stake.page.subnet");
  const locale = toIntlLocale(useLocale());
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

  // `amount` is the raw input string — it can be "", "1e5" or "abc". ICU
  // `{amount, number}` throws on a non-number and would take the whole dialog
  // down, so every message gets a normalized number, never the raw value.
  const safeAmt = Number.isFinite(amt) ? amt : 0;

  const ctaLabel =
    phase === "approve"
      ? t("dialog.phaseApprove")
      : phase === "stake"
        ? t("dialog.phaseStake")
        : t("dialog.cta", { amount: safeAmt });

  const onStake = async () => {
    if (!canStake) return;
    const ok = await stake(amount);
    if (ok) {
      toast.success(t("dialog.toastStaked"), {
        description: t("dialog.toastStakedDesc", { amount: safeAmt }),
      });
      setAmount("");
      setNonce((n) => n + 1);
    } else {
      toast.error(t("dialog.toastStakeFailed"), { description: error ?? undefined });
    }
  };

  const onWithdraw = async () => {
    if (!position || position.staked <= 0) return;
    const ok = await withdraw(String(position.staked));
    if (ok) {
      toast.success(t("dialog.toastWithdrawn"), {
        // Pre-formatted (4 decimals) rather than ICU `{n, number}`, whose default
        // 3-digit rounding would print a different figure than the position card.
        description: t("dialog.toastWithdrawnDesc", { amount: fmt(position.staked, locale, 4) }),
      });
      setNonce((n) => n + 1);
    } else {
      toast.error(t("dialog.toastWithdrawFailed"), { description: error ?? undefined });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] gap-0 overflow-y-auto rounded-3xl border-emerald-500/25 bg-background p-0 sm:max-w-[720px]">
        <div className="flex flex-col gap-6 p-6 sm:p-8">
          {/* Header */}
          <div className="pr-6">
            <div className="flex flex-wrap items-center gap-3">
              <Image
                src="/logos/morpheus.webp"
                alt="Morpheus"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <DialogTitle className="text-2xl font-black tracking-tight sm:text-3xl">
                {t("dialog.title")}
              </DialogTitle>
              {/* Token symbol + chain name: a key so it stays with the rest of the
                  header copy, identical in both locales. */}
              <span className="rounded-full border border-emerald-500/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {t("dialog.badge")}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t("dialog.desc")}</p>
          </div>

          {/* Milestones hero */}
          <section className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.02] to-transparent p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {t("dialog.milestonesLabel")}
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <CountUp
                    value={totalStaked}
                    decimals={0}
                    className="text-4xl font-black tabular-nums"
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    / {fmt(SUBNET_GOAL_MOR, locale, 0)} MOR
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                {t("dialog.progressToEvent", { pct: pctLabel, n: SUBNET_GOAL_MOR })}
              </span>
            </div>

            {/* Progress bar with milestone ticks */}
            <div className="relative mt-5 pb-1 sm:pb-7">
              <div className="h-4 w-full rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <div
                  className="h-4 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-[#2be58b] shadow-[0_0_16px_rgba(43,229,139,.6)] transition-all duration-700"
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
                        done
                          ? "bg-emerald-600 shadow-[0_0_6px_rgba(43,229,139,.8)] dark:bg-[#2be58b]"
                          : "bg-emerald-500/25",
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
                        done
                          ? "bg-emerald-500 text-white"
                          : "border border-border text-muted-foreground",
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
                      {t("milestoneRow", { n: m.amountMor, what: t("milestones." + m.id) })}{" "}
                      {/* Same committed/proposed label the page ladder carries.
                          Dropping it here would make the dialog read as six firm
                          promises while the section behind it says five are not. */}
                      <span className="text-[10px] font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase">
                        · {t("firmness." + m.firmness)}
                      </span>
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
                  {t("dialog.totalStaked")}
                </div>
                <div className="mt-0.5 text-lg font-black tabular-nums">
                  {fmt(totalStaked, locale, 0)}{" "}
                  <span className="text-xs font-medium text-muted-foreground">MOR</span>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("dialog.yourStake")}
                </div>
                <div className="mt-0.5 text-lg font-black tabular-nums">
                  {fmt(position?.staked ?? 0, locale, 4)}{" "}
                  <span className="text-xs font-medium text-muted-foreground">MOR</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {t("dialog.balance")}{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {fmt(walletMor, locale, 4)}
                </span>{" "}
                MOR
              </span>
              <button
                type="button"
                onClick={() => setAmount(String(walletMor))}
                disabled={walletMor <= 0}
                className="rounded-full border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-600 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400"
              >
                {t("dialog.max")}
              </button>
            </div>

            <Input
              type="number"
              inputMode="decimal"
              // SUBNET_MIN_DEPOSIT_MOR is a decimal *string* ("0.001"), so it goes
              // through fmt as a plain interpolation — ICU `{n, number}` would
              // reject the string, and its 3-digit default would round the min away.
              placeholder={t("dialog.minPlaceholder", {
                n: fmt(Number(SUBNET_MIN_DEPOSIT_MOR), locale, 6),
              })}
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
                  className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-emerald-500/50 hover:text-foreground"
                >
                  {v}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(String(walletMor))}
                disabled={walletMor <= 0}
                className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-emerald-500/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("dialog.max")}
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
                className="mt-4 w-full bg-emerald-500 text-white hover:bg-emerald-600"
              >
                {ctaLabel}
              </Button>
            )}

            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {t("dialog.disclaimer")}
            </p>
          </section>

          {/* Position / withdraw */}
          {position && position.staked > 0 && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 p-4 sm:p-5">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("dialog.yourPosition")}
                </div>
                <div className="mt-0.5 text-lg font-black tabular-nums">
                  {fmt(position.staked, locale, 4)}{" "}
                  <span className="text-xs font-medium text-muted-foreground">MOR</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  {locked ? (
                    <>
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {t("dialog.unlocksIn", { d: daysLeft, h: hoursLeft })}
                      </span>
                    </>
                  ) : (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {t("dialog.unlocked")}
                    </span>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" disabled={isBusy || locked} onClick={onWithdraw}>
                {phase === "withdraw" ? t("dialog.phaseWithdraw") : t("dialog.withdraw")}
              </Button>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
