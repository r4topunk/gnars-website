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

interface StakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  image: string;
  accent: string; // hex
}

const PRESETS = [0.1, 0.5, 1, 5];

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

function fmtEth(n: number) {
  if (!isFinite(n) || n === 0) return "0";
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
  const [amount, setAmount] = useState("1");

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

  const apr = yields?.eth?.apy ?? 0;
  const amountNum = Math.max(0, parseFloat(amount) || 0);
  const annualEth = (amountNum * apr) / 100;

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
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: accent }} />
            {t("stakeCta", { name })}
          </DialogTitle>
          <DialogDescription>{t("dialogIntro", { name })}</DialogDescription>
        </DialogHeader>

        {/* Amount */}
        <div className="mt-4 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("amountLabel")}
          </label>
          <div className="relative">
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="pr-14 text-lg font-semibold"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              ETH
            </span>
          </div>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                className="cursor-pointer rounded-md border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted"
              >
                {p} ETH
              </button>
            ))}
          </div>
          {apr > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("aprNote", { apr: apr.toFixed(2), source: yields?.eth?.source ?? "Lido" })}
            </p>
          ) : null}
        </div>

        {/* Flow */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("flowTitle")}
          </p>
          <StakeFlowChart
            accent={accent}
            sourceLabel={t("flowSource")}
            targets={shares.map((s) => (s.key === "treasury" ? { ...s, label: "Gnars" } : s))}
          />
        </div>

        {/* Earnings preview */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("projected")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {shares.map((s) => {
              const eth = annualEth * (s.percent / 100);
              return (
                <div
                  key={s.key}
                  className="rounded-lg border border-border/60 bg-muted/30 p-3 text-center"
                >
                  <p className="truncate text-[11px] font-medium text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-1 text-sm font-bold tabular-nums" style={{ color: accent }}>
                    {fmtEth(eth)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">ETH {t("perYear")}</p>
                  {ethUsd > 0 ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
                      ≈ {fmtUsd(eth * ethUsd)}
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
            className={cn("cursor-pointer gap-2 text-white")}
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
