"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Info, Zap, Gift, TrendingUp, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getRider } from "@/lib/gnars-vaults";
import { useStakeDeposit } from "@/hooks/use-stake-deposit";
import { useMorpheusStake } from "@/hooks/use-morpheus-stake";
import { useVaultPosition, useVaultEarned } from "@/hooks/use-vault-total";

// Only offer a rewards claim once it's worth more than the gas to take it.
const CLAIM_FLOOR_USD = 1;
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { StakeYields } from "@/services/yields";
import { REWARD_SPLIT } from "./CharacterSelector";
import { StakeFlowChart } from "./StakeFlowChart";

// The opportunities a rider "offers" — a stable Morpho vault plus the two
// higher-upside Morpheus (MOR) pools. Each drives a different stake flow.
type OppId = "vault-usdc" | "mor-steth" | "mor-usdc";
interface Opp {
  id: OppId;
  kind: "vault" | "mor";
  /** deposit asset */
  asset: "usdc" | "steth";
  unit: string;
  labelKey: string;
  presets: number[];
  default: string;
}
const OPPS: Opp[] = [
  { id: "vault-usdc", kind: "vault", asset: "usdc", unit: "USDC", labelKey: "opp.vaultUsdc", presets: [100, 500, 1000, 5000], default: "1000" },
  { id: "mor-steth", kind: "mor", asset: "steth", unit: "stETH", labelKey: "opp.morSteth", presets: [0.01, 0.1, 0.5, 1], default: "0.1" },
  { id: "mor-usdc", kind: "mor", asset: "usdc", unit: "USDC", labelKey: "opp.morUsdc", presets: [100, 500, 1000, 5000], default: "1000" },
];

interface StakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rider id — picks which sponsorship vault the deposit goes into. */
  riderId: string;
  name: string;
  image: string;
  accent: string; // hex
}

async function fetchYields(): Promise<StakeYields> {
  const res = await fetch("/api/yields");
  if (!res.ok) throw new Error("yields");
  return res.json();
}

async function fetchEthPrice(): Promise<number> {
  const res = await fetch("/api/eth-price");
  if (!res.ok) return 0;
  const json = (await res.json()) as { usd?: number };
  return json.usd ?? 0;
}

function fmtAmount(n: number, usdc: boolean) {
  if (!isFinite(n) || n === 0) return "0";
  if (usdc) return n.toFixed(2);
  return n < 0.001 ? n.toExponential(2) : n.toFixed(n < 1 ? 4 : 3);
}

function fmtUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n < 100 ? 2 : 0,
  });
}

export function StakeDialog({ open, onOpenChange, riderId, name, image, accent }: StakeDialogProps) {
  const t = useTranslations("stake");
  const { stake, withdrawAll, claimRewards, phase: stakePhase, error: stakeError, isStaking, account } =
    useStakeDeposit();
  const morpheus = useMorpheusStake();
  const [refresh, setRefresh] = useState(0);
  const [oppId, setOppId] = useState<OppId>("vault-usdc");
  const [amount, setAmount] = useState(OPPS[0].default);

  const { data: yields } = useQuery({
    queryKey: ["stake-yields"],
    queryFn: fetchYields,
    staleTime: 60_000,
  });
  const { data: ethUsd = 0 } = useQuery({
    queryKey: ["eth-price"],
    queryFn: fetchEthPrice,
    staleTime: 60_000,
  });

  const opp = OPPS.find((o) => o.id === oppId)!;
  const isMor = opp.kind === "mor";
  const isUsdc = opp.asset === "usdc";

  // APR per opportunity: the Morpho vault's live APY, or the blended Morpheus rate.
  const aprFor = (o: Opp) => (o.kind === "vault" ? yields?.usdc?.apy : yields?.mor?.apy) ?? 0;
  const rate = aprFor(opp);
  const source = isMor ? "Morpheus" : yields?.usdc?.source ?? "Morpho";

  const assetUsd = opp.asset === "steth" ? ethUsd : 1; // stETH ≈ ETH, USDC ≈ $1
  const amountNum = Math.max(0, parseFloat(amount) || 0);
  const amountUsd = amountNum * assetUsd;
  const annualUsd = (amountUsd * rate) / 100; // value/yr; for MOR it's paid in MOR
  const annualAsset = (amountNum * rate) / 100; // vault: yield in the deposit asset

  const busy = isMor ? morpheus.isBusy : isStaking;

  const switchOpp = (next: OppId) => {
    const o = OPPS.find((x) => x.id === next)!;
    setOppId(next);
    setAmount(o.default);
  };

  const shares = [
    { key: "you" as const, label: t("youLabel"), percent: REWARD_SPLIT.you },
    { key: "skater" as const, label: name, percent: REWARD_SPLIT.skater, image },
    {
      key: "treasury" as const,
      label: t("treasuryLabel"),
      percent: REWARD_SPLIT.treasury,
      image: "/gnars.webp",
    },
  ];

  // Vault position (USDC Morpho) — only relevant for the stable opportunity.
  const rider = getRider(riderId);
  const position = useVaultPosition(rider?.vault, account ?? undefined, refresh);
  const earned = useVaultEarned(rider?.vault, account ?? undefined, refresh);

  const handleClaim = async () => {
    if (!rider?.vault || !earned || earned.earnedRaw <= BigInt(0)) return;
    const ok = await claimRewards(rider.vault, earned.earnedRaw);
    if (ok) {
      toast.success(t("dlg.claimedTitle"), { description: t("dlg.claimedDesc") });
      setRefresh((n) => n + 1);
    } else {
      toast.error(t("dlg.claimFailTitle"), { description: stakeError ?? undefined });
    }
  };

  const handleWithdraw = async () => {
    if (!rider?.vault || !position || position.shares <= BigInt(0)) return;
    const ok = await withdrawAll(rider.vault, position.shares);
    if (ok) {
      toast.success(t("dlg.withdrewTitle"), { description: t("dlg.withdrewDesc") });
      setRefresh((n) => n + 1);
    } else {
      toast.error(t("dlg.withdrawFailTitle"), { description: stakeError ?? undefined });
    }
  };

  const handleConfirm = async () => {
    if (isMor) {
      if (!rider?.wallet) return;
      const ok = await morpheus.stake(opp.asset === "steth" ? "stEth" : "usdc", amount, rider.wallet);
      if (ok) {
        toast.success(t("opp.stakedMorTitle", { name }), { description: t("opp.stakedMorDesc") });
        setRefresh((n) => n + 1);
        onOpenChange(false);
      } else {
        toast.error(t("dlg.failTitle"), { description: morpheus.error ?? undefined });
      }
      return;
    }
    if (!rider?.vault) {
      toast.info(t("dlg.noVaultTitle"), { description: t("dlg.noVaultDesc", { name }) });
      return;
    }
    const ok = await stake(rider.vault, amount);
    if (ok) {
      toast.success(t("stakeToast", { name }), { description: t("dlg.stakedDesc") });
      setRefresh((n) => n + 1);
      onOpenChange(false);
    } else {
      toast.error(t("dlg.failTitle"), { description: stakeError ?? undefined });
    }
  };

  const confirmLabel = isMor
    ? morpheus.phase === "approve"
      ? t("opp.approving")
      : morpheus.phase === "stake"
        ? t("opp.staking")
        : t("stakeCta", { name })
    : stakePhase === "approve"
      ? t("dlg.approving")
      : stakePhase === "deposit"
        ? t("dlg.depositing")
        : t("stakeCta", { name });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: accent }} />
            {t("stakeCta", { name })}
          </DialogTitle>
          <DialogDescription>{t("dialogIntro", { name })}</DialogDescription>
        </DialogHeader>

        {/* Opportunity chooser */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("opp.choose", { name })}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {OPPS.map((o) => {
              const active = o.id === oppId;
              const mor = o.kind === "mor";
              const apr = aprFor(o);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => switchOpp(o.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                    active
                      ? "border-transparent ring-2"
                      : "border-border/60 hover:border-border-strong hover:bg-muted/40",
                  )}
                  style={active ? ({ "--tw-ring-color": accent } as CSSProperties) : undefined}
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="text-sm font-bold">{t(o.labelKey)}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        mor ? "bg-violet-500/15 text-violet-400" : "bg-emerald-500/15 text-emerald-500",
                      )}
                    >
                      {mor ? <TrendingUp className="h-2.5 w-2.5" /> : <ShieldCheck className="h-2.5 w-2.5" />}
                      {mor ? t("opp.morTag") : t("opp.stableTag")}
                    </span>
                  </span>
                  <span className="flex items-baseline gap-1">
                    <span className="text-xl font-black tabular-nums" style={{ color: accent }}>
                      {apr ? `${mor ? "~" : ""}${apr.toFixed(1)}%` : "—"}
                    </span>
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">
                      {mor ? "APR · est." : "APY"}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">{o.unit}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls + flow, side by side on desktop */}
        <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:items-center">
          {/* Left: amount */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("amountLabel")}
              </label>
              <div className="relative">
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="pr-16 text-lg font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  {opp.unit}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {opp.presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(String(p))}
                    className="cursor-pointer rounded-md border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                  >
                    {p} {opp.unit}
                  </button>
                ))}
              </div>
              {rate > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {isMor
                    ? t("opp.estNote", { rate: rate.toFixed(1) })
                    : t("aprNote", { rate: rate.toFixed(2), rateType: "APY", source })}
                </p>
              ) : null}
              {isMor ? (
                <p className="flex items-start gap-1.5 text-[11px] leading-snug text-warning">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                  {t("opp.mainnetWarn")}
                </p>
              ) : null}
            </div>
          </div>

          {/* Right: flow — 3-way vault split, or the MOR explainer */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isMor ? t("opp.morHow") : t("flowTitle")}
            </p>
            {isMor ? (
              <div className="space-y-2 rounded-xl border border-violet-500/30 bg-violet-500/[0.04] p-3">
                <MorRow icon={<TrendingUp className="h-4 w-4 text-violet-400" />} title={t("opp.youKeepMor")} />
                <MorRow icon={<Zap className="h-4 w-4 text-violet-400" />} title={t("opp.athleteBonus", { name })} />
                <MorRow icon={<Gift className="h-4 w-4 text-violet-400" />} title={t("opp.donateOpt")} />
              </div>
            ) : (
              <StakeFlowChart
                accent={accent}
                sourceLabel={t("flowSource")}
                targets={shares.map((s) => (s.key === "treasury" ? { ...s, label: "Gnars" } : s))}
              />
            )}
          </div>
        </div>

        {/* Earnings preview */}
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("projected")}
          </p>
          {isMor ? (
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/[0.04] p-4 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("opp.estYearLabel")}
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums" style={{ color: accent }}>
                ≈ {fmtUsd(annualUsd)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("opp.estYearNote")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {shares.map((s) => {
                const share = annualAsset * (s.percent / 100);
                return (
                  <div
                    key={s.key}
                    className="rounded-lg border border-border/60 bg-muted/30 p-3 text-center"
                  >
                    <p className="truncate text-[11px] font-medium text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-base font-bold tabular-nums" style={{ color: accent }}>
                      {fmtAmount(share, isUsdc)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {opp.unit} {t("perYear")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          {t("disclaimer")}
        </p>

        <DialogFooter className="mt-4">
          {!isMor && position && position.shares > BigInt(0) && (
            <div className="mr-auto flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-xs text-muted-foreground">
                {t("opp.yourPosition")}:{" "}
                <strong className="font-mono text-foreground">${position.assets.toFixed(2)}</strong>
                {earned && earned.principal > 0 && (
                  <>
                    {" "}
                    <span className="opacity-70">
                      ({t("opp.principal")} ${earned.principal.toFixed(2)} · {t("opp.yield")}{" "}
                      <span className="text-emerald-500">${earned.earned.toFixed(2)}</span>)
                    </span>
                  </>
                )}
              </span>
              <div className="flex items-center gap-2">
                {earned && earned.earned >= CLAIM_FLOOR_USD && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClaim}
                    disabled={isStaking}
                    className="cursor-pointer"
                  >
                    {stakePhase === "claim" ? t("dlg.claiming") : t("dlg.claim", { amount: `$${earned.earned.toFixed(2)}` })}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWithdraw}
                  disabled={isStaking}
                  className="cursor-pointer"
                >
                  {stakePhase === "withdraw" ? t("dlg.withdrawing") : t("dlg.withdrawAll")}
                </Button>
              </div>
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            {t("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={busy}
            className="cursor-pointer gap-2 text-white"
            style={{ backgroundColor: accent }}
          >
            <Zap className="h-4 w-4" />
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MorRow({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
        {icon}
      </span>
      <span className="text-sm font-medium">{title}</span>
    </div>
  );
}
