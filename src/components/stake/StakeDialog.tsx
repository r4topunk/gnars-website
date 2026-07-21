"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Info, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

type Asset = "eth" | "usdc";

interface StakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  image: string;
  accent: string; // hex
}

const ASSETS: Record<
  Asset,
  { unit: string; rateType: string; presets: number[]; default: string }
> = {
  eth: { unit: "ETH", rateType: "APR", presets: [0.1, 0.5, 1, 5], default: "1" },
  usdc: { unit: "USDC", rateType: "APY", presets: [100, 500, 1000, 5000], default: "1000" },
};

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

function fmtAmount(n: number, asset: Asset) {
  if (!isFinite(n) || n === 0) return "0";
  if (asset === "usdc") return n.toFixed(2);
  return n < 0.001 ? n.toExponential(2) : n.toFixed(n < 1 ? 4 : 3);
}

function fmtUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function StakeDialog({ open, onOpenChange, name, image, accent }: StakeDialogProps) {
  const t = useTranslations("stake");
  const [asset, setAsset] = useState<Asset>("eth");
  const [amount, setAmount] = useState(ASSETS.eth.default);

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

  const cfg = ASSETS[asset];
  const yieldData = asset === "eth" ? yields?.eth : yields?.usdc;
  const rate = yieldData?.apy ?? 0;
  const source = yieldData?.source ?? (asset === "eth" ? "Lido" : "Morpho");
  const unitUsd = asset === "eth" ? ethUsd : 1; // USDC ≈ $1

  const amountNum = Math.max(0, parseFloat(amount) || 0);
  const annual = (amountNum * rate) / 100;

  const switchAsset = (next: Asset) => {
    setAsset(next);
    setAmount(ASSETS[next].default);
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

  const handleConfirm = () => {
    toast.success(t("stakeToast", { name }));
    onOpenChange(false);
  };

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

        {/* Controls + flow, side by side on desktop */}
        <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:items-center">
          {/* Left: asset + amount */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/30 p-1">
              {(Object.keys(ASSETS) as Asset[]).map((a) => {
                const active = a === asset;
                const y = a === "eth" ? yields?.eth : yields?.usdc;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => switchAsset(a)}
                    aria-pressed={active}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition",
                      active ? "text-white" : "text-muted-foreground hover:bg-muted",
                    )}
                    style={active ? { backgroundColor: accent } : undefined}
                  >
                    <span>{ASSETS[a].unit}</span>
                    <span
                      className={cn("text-xs font-bold tabular-nums", !active && "text-foreground")}
                    >
                      {y ? `${y.apy.toFixed(2)}%` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>

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
                  {cfg.unit}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cfg.presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(String(p))}
                    className="cursor-pointer rounded-md border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                  >
                    {p} {cfg.unit}
                  </button>
                ))}
              </div>
              {rate > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("aprNote", { rate: rate.toFixed(2), rateType: cfg.rateType, source })}
                </p>
              ) : null}
            </div>
          </div>

          {/* Right: flow */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("flowTitle")}
            </p>
            <StakeFlowChart
              accent={accent}
              sourceLabel={t("flowSource")}
              targets={shares.map((s) => (s.key === "treasury" ? { ...s, label: "Gnars" } : s))}
            />
          </div>
        </div>

        {/* Earnings preview — full width */}
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("projected")}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {shares.map((s) => {
              const earned = annual * (s.percent / 100);
              return (
                <div
                  key={s.key}
                  className="rounded-lg border border-border/60 bg-muted/30 p-3 text-center"
                >
                  <p className="truncate text-[11px] font-medium text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-1 text-base font-bold tabular-nums" style={{ color: accent }}>
                    {fmtAmount(earned, asset)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {cfg.unit} {t("perYear")}
                  </p>
                  {asset === "eth" && unitUsd > 0 ? (
                    <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                      ≈ {fmtUsd(earned * unitUsd)}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          {t("disclaimer")}
        </p>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            {t("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            className="cursor-pointer gap-2 text-white"
            style={{ backgroundColor: accent }}
          >
            <Zap className="h-4 w-4" />
            {t("stakeCta", { name })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
